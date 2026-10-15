import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { insurances } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

const requireDb = () => {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Veritabanı bağlantısı yok" });
  return db;
};

export const insurancesRouter = router({
  list: publicProcedure.query(async () => {
    return requireDb().select().from(insurances).orderBy(asc(insurances.endDate));
  }),

  create: publicProcedure
    .input(
      z.object({
        kind: z.enum(["sigorta", "kasko", "muayene", "diger"]).default("sigorta"),
        holder: z.string().optional(), // plaka veya kişi
        provider: z.string().optional(),
        policyNo: z.string().optional(),
        amount: z.number().nonnegative().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        reminderDays: z.number().min(1).max(90).default(15),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [row] = await requireDb().insert(insurances).values(input).returning();
      return row;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        kind: z.enum(["sigorta", "kasko", "muayene", "diger"]).optional(),
        holder: z.string().nullable().optional(),
        provider: z.string().nullable().optional(),
        policyNo: z.string().nullable().optional(),
        amount: z.number().nonnegative().nullable().optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
        reminderDays: z.number().min(1).max(90).optional(),
        isActive: z.number().optional(),
        note: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [row] = await requireDb().update(insurances).set(data).where(eq(insurances.id, id)).returning();
      return row;
    }),

  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await requireDb().delete(insurances).where(eq(insurances.id, input.id));
    return { success: true };
  }),
});
