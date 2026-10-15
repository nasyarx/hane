import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { zakatPayments, zakatRecords } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { computeZakat } from "../lib/budget";

const requireDb = () => {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Veritabanı bağlantısı yok" });
  return db;
};

export const zakatRouter = router({
  list: publicProcedure.query(async () => {
    const records = await requireDb().select().from(zakatRecords).orderBy(desc(zakatRecords.year));
    const payments = await requireDb().select().from(zakatPayments).orderBy(desc(zakatPayments.paidDate));
    return records.map(r => {
      const given = payments.filter(p => p.year === r.year).reduce((s, p) => s + p.amount, 0);
      return {
        ...r,
        payments: payments.filter(p => p.year === r.year),
        givenAmount: given,
        remainingAmount: Math.max(0, Math.round((r.calculatedAmount - given) * 100) / 100),
      };
    });
  }),

  /** Hesapla (kaydetmeden önizleme) */
  preview: publicProcedure
    .input(z.object({ totalWealth: z.number().nonnegative(), goldPricePerGram: z.number().positive() }))
    .query(({ input }) => computeZakat(input.totalWealth, input.goldPricePerGram)),

  /** Yıllık zekât hesabı oluştur/güncelle */
  saveRecord: publicProcedure
    .input(
      z.object({
        year: z.number().int().min(2000).max(2100),
        totalWealth: z.number().nonnegative(),
        goldPricePerGram: z.number().positive(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const database = requireDb();
      const result = computeZakat(input.totalWealth, input.goldPricePerGram);
      const [existing] = await database.select().from(zakatRecords).where(eq(zakatRecords.year, input.year));
      const values = {
        year: input.year,
        totalWealth: input.totalWealth,
        goldPricePerGram: input.goldPricePerGram,
        nisabAmount: result.nisabAmount,
        calculatedAmount: result.calculatedAmount,
        note: input.note,
      };
      if (existing) {
        const [row] = await database
          .update(zakatRecords)
          .set(values)
          .where(eq(zakatRecords.year, input.year))
          .returning();
        return row;
      }
      const [row] = await database.insert(zakatRecords).values(values).returning();
      return row;
    }),

  deleteRecord: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await requireDb().delete(zakatRecords).where(eq(zakatRecords.id, input.id));
    return { success: true };
  }),

  /** Verilen zekât ödemesi ekle */
  addPayment: publicProcedure
    .input(
      z.object({
        year: z.number().int().min(2000).max(2100),
        amount: z.number().positive(),
        paidDate: z.string(),
        recipient: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [row] = await requireDb().insert(zakatPayments).values(input).returning();
      return row;
    }),

  deletePayment: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await requireDb().delete(zakatPayments).where(eq(zakatPayments.id, input.id));
    return { success: true };
  }),
});
