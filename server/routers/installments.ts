import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { installmentPayments, installments, transactions } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

const requireDb = () => {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Veritabanı bağlantısı yok" });
  return db;
};

export const installmentsRouter = router({
  list: publicProcedure.query(async () => {
    const rows = await requireDb().select().from(installments).orderBy(desc(installments.createdAt));
    const payments = await requireDb()
      .select()
      .from(installmentPayments)
      .orderBy(desc(installmentPayments.installmentNo));
    return rows.map(i => ({ ...i, payments: payments.filter(p => p.installmentId === i.id) }));
  }),

  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        place: z.string().optional(),
        totalAmount: z.number().positive(),
        installmentCount: z.number().min(1),
        monthlyAmount: z.number().positive(),
        startDate: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [row] = await requireDb().insert(installments).values(input).returning();
      return row;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        place: z.string().nullable().optional(),
        totalAmount: z.number().positive().optional(),
        installmentCount: z.number().min(1).optional(),
        paidCount: z.number().min(0).optional(),
        monthlyAmount: z.number().positive().optional(),
        startDate: z.string().nullable().optional(),
        isActive: z.number().optional(),
        note: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [row] = await requireDb().update(installments).set(data).where(eq(installments.id, id)).returning();
      return row;
    }),

  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await requireDb().delete(installments).where(eq(installments.id, input.id));
    return { success: true };
  }),

  /** Bir taksit ödemesi kaydet: gider işlemi oluşturur, sayacı ilerletir */
  pay: publicProcedure
    .input(
      z.object({
        installmentId: z.number(),
        amount: z.number().positive(),
        paidDate: z.string(),
        installmentNo: z.number().optional(),
        createTransaction: z.boolean().default(true),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const database = requireDb();
      const [inst] = await database.select().from(installments).where(eq(installments.id, input.installmentId));
      if (!inst) throw new TRPCError({ code: "NOT_FOUND", message: "Taksit bulunamadı" });

      const no = input.installmentNo ?? inst.paidCount + 1;
      const [payment] = await database
        .insert(installmentPayments)
        .values({
          installmentId: input.installmentId,
          installmentNo: no,
          amount: input.amount,
          paidDate: input.paidDate,
          note: input.note,
        })
        .returning();

      const paidCount = Math.min(inst.paidCount + 1, inst.installmentCount);
      const isActive = paidCount >= inst.installmentCount ? 0 : 1;
      await database.update(installments).set({ paidCount, isActive }).where(eq(installments.id, input.installmentId));

      if (input.createTransaction) {
        await database.insert(transactions).values({
          type: "expense",
          amount: input.amount,
          title: `Taksit ${no}/${inst.installmentCount}: ${inst.title}`,
          description: inst.place ?? input.note ?? undefined,
          paymentMethod: "kredi kartı",
          date: new Date(input.paidDate + "T12:00:00"),
        });
      }

      return { payment, paidCount, isActive };
    }),
});
