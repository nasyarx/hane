import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { bankPromotions } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

const requireDb = () => {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Veritabanı bağlantısı yok" });
  return db;
};

export const promotionsRouter = router({
  list: publicProcedure.query(async () => {
    return requireDb().select().from(bankPromotions).orderBy(desc(bankPromotions.date));
  }),

  create: publicProcedure
    .input(
      z.object({
        bank: z.string().min(1),
        direction: z.enum(["in", "out"]).default("in"),
        kind: z.enum(["maas_promosyonu", "odul_puan", "komisyon", "diger"]).default("maas_promosyonu"),
        amount: z.number().positive(),
        date: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [row] = await requireDb().insert(bankPromotions).values(input).returning();
      return row;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        bank: z.string().min(1).optional(),
        direction: z.enum(["in", "out"]).optional(),
        kind: z.enum(["maas_promosyonu", "odul_puan", "komisyon", "diger"]).optional(),
        amount: z.number().positive().optional(),
        date: z.string().optional(),
        description: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [row] = await requireDb().update(bankPromotions).set(data).where(eq(bankPromotions.id, id)).returning();
      return row;
    }),

  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await requireDb().delete(bankPromotions).where(eq(bankPromotions.id, input.id));
    return { success: true };
  }),

  totals: publicProcedure.query(async () => {
    const rows = await requireDb().select().from(bankPromotions);
    const incoming = rows.filter(r => r.direction === "in").reduce((s, r) => s + r.amount, 0);
    const outgoing = rows.filter(r => r.direction === "out").reduce((s, r) => s + r.amount, 0);
    return { incoming, outgoing, net: incoming - outgoing };
  }),
});
