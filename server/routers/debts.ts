import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { debtPayments, debts, transactions } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

const requireDb = () => {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Veritabanı bağlantısı yok" });
  return db;
};

export const debtsRouter = router({
  list: publicProcedure.query(async () => {
    const rows = await requireDb().select().from(debts).orderBy(desc(debts.createdAt));
    const payments = await requireDb().select().from(debtPayments).orderBy(desc(debtPayments.paidDate));
    return rows.map(d => ({ ...d, payments: payments.filter(p => p.debtId === d.id) }));
  }),

  create: publicProcedure
    .input(
      z.object({
        kind: z.enum(["debt", "receivable"]).default("debt"),
        counterparty: z.string().min(1),
        description: z.string().optional(),
        totalAmount: z.number().positive(),
        dueDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [row] = await requireDb()
        .insert(debts)
        .values({ ...input, remainingAmount: input.totalAmount })
        .returning();
      return row;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        kind: z.enum(["debt", "receivable"]).optional(),
        counterparty: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        totalAmount: z.number().positive().optional(),
        remainingAmount: z.number().nonnegative().optional(),
        dueDate: z.string().nullable().optional(),
        isSettled: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [row] = await requireDb().update(debts).set(data).where(eq(debts.id, id)).returning();
      return row;
    }),

  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await requireDb().delete(debts).where(eq(debts.id, input.id));
    return { success: true };
  }),

  /** Ödeme/tahsilat kaydet: kalanı düşer, gerekirse işlem de oluşturur */
  pay: publicProcedure
    .input(
      z.object({
        debtId: z.number(),
        amount: z.number().positive(),
        paidDate: z.string(),
        createTransaction: z.boolean().default(true),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const database = requireDb();
      const [debt] = await database.select().from(debts).where(eq(debts.id, input.debtId));
      if (!debt) throw new TRPCError({ code: "NOT_FOUND", message: "Kayıt bulunamadı" });

      const [payment] = await database
        .insert(debtPayments)
        .values({ debtId: input.debtId, amount: input.amount, paidDate: input.paidDate, note: input.note })
        .returning();

      const remaining = Math.max(0, Math.round((debt.remainingAmount - input.amount) * 100) / 100);
      const isSettled = remaining === 0 ? 1 : 0;
      await database.update(debts).set({ remainingAmount: remaining, isSettled }).where(eq(debts.id, input.debtId));

      if (input.createTransaction) {
        // Borcumuzu öderken gider çıkar; alacak tahsil ederken gelir kaydet
        await database.insert(transactions).values({
          type: debt.kind === "debt" ? "expense" : "income",
          amount: input.amount,
          title:
            debt.kind === "debt"
              ? `Borç ödemesi: ${debt.counterparty}`
              : `Alacak tahsilatı: ${debt.counterparty}`,
          description: debt.description ?? input.note ?? undefined,
          paymentMethod: "nakit",
          date: new Date(input.paidDate + "T12:00:00"),
        });
      }

      return { payment, remaining, isSettled };
    }),
});
