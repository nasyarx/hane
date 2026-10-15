import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { assets } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

const requireDb = () => {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Veritabanı bağlantısı yok" });
  return db;
};

export const assetsRouter = router({
  list: publicProcedure.query(async () => {
    return requireDb().select().from(assets).orderBy(desc(assets.currentValue));
  }),

  create: publicProcedure
    .input(
      z.object({
        kind: z.enum(["doviz", "altin", "tasinmaz", "tasinir", "nakit", "diger"]).default("doviz"),
        name: z.string().min(1),
        quantity: z.number().nonnegative().default(1),
        unit: z.string().default("TL"),
        purchaseValue: z.number().nonnegative().default(0),
        currentValue: z.number().nonnegative().default(0),
        purchaseDate: z.string().optional(),
        location: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [row] = await requireDb().insert(assets).values(input).returning();
      return row;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        kind: z.enum(["doviz", "altin", "tasinmaz", "tasinir", "nakit", "diger"]).optional(),
        name: z.string().min(1).optional(),
        quantity: z.number().nonnegative().optional(),
        unit: z.string().optional(),
        purchaseValue: z.number().nonnegative().optional(),
        currentValue: z.number().nonnegative().optional(),
        purchaseDate: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
        note: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [row] = await requireDb().update(assets).set(data).where(eq(assets.id, id)).returning();
      return row;
    }),

  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await requireDb().delete(assets).where(eq(assets.id, input.id));
    return { success: true };
  }),

  /** Tür bazlı toplamlar ve toplam kâr/zarar */
  summary: publicProcedure.query(async () => {
    const rows = await requireDb().select().from(assets);
    const byKind = new Map<string, { kind: string; purchase: number; current: number }>();
    for (const r of rows) {
      const cur = byKind.get(r.kind) ?? { kind: r.kind, purchase: 0, current: 0 };
      cur.purchase += r.purchaseValue;
      cur.current += r.currentValue;
      byKind.set(r.kind, cur);
    }
    const purchase = rows.reduce((s, r) => s + r.purchaseValue, 0);
    const current = rows.reduce((s, r) => s + r.currentValue, 0);
    return {
      byKind: Array.from(byKind.values()),
      totalPurchase: purchase,
      totalCurrent: current,
      totalGain: Math.round((current - purchase) * 100) / 100,
    };
  }),
});
