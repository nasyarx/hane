import { z } from "zod";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { categories, transactions } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { monthRange } from "../lib/budget";

const requireDb = () => {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Veritabanı bağlantısı yok" });
  return db;
};

export const transactionsRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          type: z.enum(["income", "expense"]).optional(),
          categoryId: z.number().optional(),
          from: z.number().optional(), // unix ms
          to: z.number().optional(),
          limit: z.number().min(1).max(500).default(200),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const conditions = [];
      if (input?.type) conditions.push(eq(transactions.type, input.type));
      if (input?.categoryId) conditions.push(eq(transactions.categoryId, input.categoryId));
      if (input?.from) conditions.push(gte(transactions.date, new Date(input.from)));
      if (input?.to) conditions.push(lt(transactions.date, new Date(input.to)));
      const q = requireDb()
        .select({
          id: transactions.id,
          type: transactions.type,
          amount: transactions.amount,
          title: transactions.title,
          description: transactions.description,
          categoryId: transactions.categoryId,
          memberId: transactions.memberId,
          paymentMethod: transactions.paymentMethod,
          date: transactions.date,
          categoryName: categories.name,
          categoryColor: categories.color,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .orderBy(desc(transactions.date))
        .limit(input?.limit ?? 200);
      if (conditions.length) return q.where(and(...conditions));
      return q;
    }),

  create: publicProcedure
    .input(
      z.object({
        type: z.enum(["income", "expense"]),
        amount: z.number().positive(),
        title: z.string().min(1),
        description: z.string().optional(),
        categoryId: z.number().nullable().optional(),
        memberId: z.number().nullable().optional(),
        paymentMethod: z.string().default("nakit"),
        date: z.number().optional(), // unix ms
      })
    )
    .mutation(async ({ input }) => {
      const { date, ...rest } = input;
      const [row] = await requireDb()
        .insert(transactions)
        .values({ ...rest, date: date ? new Date(date) : new Date() })
        .returning();
      return row;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        type: z.enum(["income", "expense"]).optional(),
        amount: z.number().positive().optional(),
        title: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        categoryId: z.number().nullable().optional(),
        memberId: z.number().nullable().optional(),
        paymentMethod: z.string().optional(),
        date: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, date, ...data } = input;
      const patch: Record<string, unknown> = { ...data };
      if (date !== undefined) patch.date = new Date(date);
      const [row] = await requireDb().update(transactions).set(patch).where(eq(transactions.id, id)).returning();
      return row;
    }),

  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await requireDb().delete(transactions).where(eq(transactions.id, input.id));
    return { success: true };
  }),

  /** Bu ayın gelir/gider toplamları */
  monthTotals: publicProcedure.query(async () => {
    const { start, end } = monthRange(new Date());
    const rows = await requireDb()
      .select({ type: transactions.type, amount: transactions.amount })
      .from(transactions)
      .where(and(gte(transactions.date, start), lt(transactions.date, end)));
    const income = rows.filter(r => r.type === "income").reduce((s, r) => s + r.amount, 0);
    const expense = rows.filter(r => r.type === "expense").reduce((s, r) => s + r.amount, 0);
    return { income, expense, net: income - expense };
  }),

  /** Bu ay kategori bazlı gider dağılımı */
  expenseByCategory: publicProcedure.query(async () => {
    const { start, end } = monthRange(new Date());
    const rows = await requireDb()
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        amount: transactions.amount,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(eq(transactions.type, "expense"), gte(transactions.date, start), lt(transactions.date, end)));
    const map = new Map<string, { name: string; color: string; amount: number }>();
    for (const r of rows) {
      const key = r.categoryName ?? "Kategorisiz";
      const cur = map.get(key) ?? { name: key, color: r.categoryColor ?? "#94a3b8", amount: 0 };
      cur.amount += r.amount;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }),

  /** Son 6 ay gelir/gider trendi */
  monthlyTrend: publicProcedure.query(async () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const rows = await requireDb()
      .select({ type: transactions.type, amount: transactions.amount, date: transactions.date })
      .from(transactions)
      .where(gte(transactions.date, start));
    const months: { key: string; label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("tr-TR", { month: "short" }),
        income: 0,
        expense: 0,
      });
    }
    for (const r of rows) {
      const d = new Date(r.date);
      const m = months.find(m => m.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (!m) continue;
      if (r.type === "income") m.income += r.amount;
      else m.expense += r.amount;
    }
    return months;
  }),
});
