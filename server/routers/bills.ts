import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { billPayments, bills, transactions } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

const requireDb = () => {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Veritabanı bağlantısı yok" });
  return db;
};

/** Sonraki vade tarihini ilerletir (aylık/3 aylık/yıllık). */
function advanceDueDate(due: string, period: string): string {
  const d = new Date(due + "T00:00:00");
  const months = period === "monthly" ? 1 : period === "quarterly" ? 3 : period === "yearly" ? 12 : 0;
  if (months) d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export const billsRouter = router({
  list: publicProcedure.query(async () => {
    const rows = await requireDb().select().from(bills).orderBy(asc(bills.nextDueDate), asc(bills.name));
    const payments = await requireDb().select().from(billPayments).orderBy(asc(billPayments.paidDate));
    return rows.map(b => ({ ...b, payments: payments.filter(p => p.billId === b.id) }));
  }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        provider: z.string().optional(),
        amount: z.number().nonnegative(),
        period: z.enum(["monthly", "quarterly", "yearly", "once"]).default("monthly"),
        dueDay: z.number().min(1).max(31).optional(),
        nextDueDate: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [row] = await requireDb().insert(bills).values(input).returning();
      return row;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        provider: z.string().nullable().optional(),
        amount: z.number().nonnegative().optional(),
        period: z.enum(["monthly", "quarterly", "yearly", "once"]).optional(),
        dueDay: z.number().min(1).max(31).nullable().optional(),
        nextDueDate: z.string().nullable().optional(),
        isActive: z.number().optional(),
        note: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [row] = await requireDb().update(bills).set(data).where(eq(bills.id, id)).returning();
      return row;
    }),

  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await requireDb().delete(bills).where(eq(bills.id, input.id));
    return { success: true };
  }),

  /** Faturayı ödendi işaretle: ödeme kaydı + gider işlemi + vade ilerletir */
  markPaid: publicProcedure
    .input(
      z.object({
        billId: z.number(),
        amount: z.number().positive(),
        paidDate: z.string(), // YYYY-MM-DD
        createTransaction: z.boolean().default(true),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const database = requireDb();
      const [bill] = await database.select().from(bills).where(eq(bills.id, input.billId));
      if (!bill) throw new TRPCError({ code: "NOT_FOUND", message: "Fatura bulunamadı" });

      const [payment] = await database
        .insert(billPayments)
        .values({
          billId: input.billId,
          amount: input.amount,
          paidDate: input.paidDate,
          note: input.note,
        })
        .returning();

      if (input.createTransaction) {
        await database.insert(transactions).values({
          type: "expense",
          amount: input.amount,
          title: `Fatura: ${bill.name}`,
          description: input.note ?? bill.provider ?? undefined,
          paymentMethod: "otomatik ödeme",
          date: new Date(input.paidDate + "T12:00:00"),
        });
      }

      if (bill.nextDueDate && bill.period !== "once") {
        await database
          .update(bills)
          .set({ nextDueDate: advanceDueDate(bill.nextDueDate, bill.period) })
          .where(eq(bills.id, input.billId));
      }

      return payment;
    }),
});
