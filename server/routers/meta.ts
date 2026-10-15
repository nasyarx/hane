import { z } from "zod";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { categories, members } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

const requireDb = () => {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Veritabanı bağlantısı yok" });
  return db;
};

export const metaRouter = router({
  categories: router({
    list: publicProcedure.query(async () => {
      return requireDb().select().from(categories).orderBy(categories.type, categories.name);
    }),
    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          type: z.enum(["income", "expense"]).default("expense"),
          color: z.string().default("#0f766e"),
          icon: z.string().default("tag"),
        })
      )
      .mutation(async ({ input }) => {
        const [row] = await requireDb().insert(categories).values(input).returning();
        return row;
      }),
    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          type: z.enum(["income", "expense"]).optional(),
          color: z.string().optional(),
          icon: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const [row] = await requireDb().update(categories).set(data).where(eq(categories.id, id)).returning();
        return row;
      }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await requireDb().delete(categories).where(eq(categories.id, input.id));
      return { success: true };
    }),
  }),

  members: router({
    list: publicProcedure.query(async () => {
      return requireDb().select().from(members).orderBy(members.name);
    }),
    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          relation: z.string().default("birey"),
          note: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const [row] = await requireDb().insert(members).values(input).returning();
        return row;
      }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await requireDb().delete(members).where(eq(members.id, input.id));
      return { success: true };
    }),
  }),
});
