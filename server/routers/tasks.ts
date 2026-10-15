import { z } from "zod";
import { and, asc, eq, isNull, lte, or } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { tasks } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { nextRepeatDate, type Repeat } from "../lib/budget";

const requireDb = () => {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Veritabanı bağlantısı yok" });
  return db;
};

export const tasksRouter = router({
  list: publicProcedure.query(async () => {
    const rows = await requireDb().select().from(tasks).orderBy(asc(tasks.completed), asc(tasks.dueDate));
    return rows;
  }),

  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        kind: z.enum(["task", "reminder"]).default("task"),
        repeat: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).default("none"),
        priority: z.enum(["low", "normal", "high"]).default("normal"),
        dueDate: z.number().nullable().optional(), // unix ms
      })
    )
    .mutation(async ({ input }) => {
      const { dueDate, ...rest } = input;
      const [row] = await requireDb()
        .insert(tasks)
        .values({ ...rest, dueDate: dueDate ? new Date(dueDate) : null })
        .returning();
      return row;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        kind: z.enum(["task", "reminder"]).optional(),
        repeat: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).optional(),
        priority: z.enum(["low", "normal", "high"]).optional(),
        dueDate: z.number().nullable().optional(),
        completed: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, dueDate, completed, ...rest } = input;
      const patch: Record<string, unknown> = { ...rest };
      if (dueDate !== undefined) patch.dueDate = dueDate ? new Date(dueDate) : null;
      if (completed !== undefined) {
        patch.completed = completed;
        patch.completedAt = completed ? new Date() : null;
      }
      const [row] = await requireDb().update(tasks).set(patch).where(eq(tasks.id, id)).returning();
      return row;
    }),

  /**
   * Görevi tamamla. Tekrarlı görevse (günlük/haftalık/aylık/yıllık) bir sonraki
   * vadeli yeni görev otomatik oluşturulur.
   */
  complete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const database = requireDb();
    const [task] = await database.select().from(tasks).where(eq(tasks.id, input.id));
    if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Görev bulunamadı" });

    const [row] = await database
      .update(tasks)
      .set({ completed: 1, completedAt: new Date() })
      .where(eq(tasks.id, input.id))
      .returning();

    if (task.repeat !== "none") {
      const base = task.dueDate ?? new Date();
      const next = nextRepeatDate(base, task.repeat as Repeat);
      if (next) {
        await database.insert(tasks).values({
          title: task.title,
          description: task.description,
          kind: task.kind,
          repeat: task.repeat,
          priority: task.priority,
          dueDate: next,
        });
      }
    }
    return row;
  }),

  reopen: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const [row] = await requireDb()
      .update(tasks)
      .set({ completed: 0, completedAt: null })
      .where(eq(tasks.id, input.id))
      .returning();
    return row;
  }),

  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await requireDb().delete(tasks).where(eq(tasks.id, input.id));
    return { success: true };
  }),

  /** Yaklaşan (vadesi geçmiş + bugün + önümüzdeki günler) tamamlanmamış görevler */
  upcoming: publicProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(7) }))
    .query(async ({ input }) => {
      const now = new Date();
      const until = new Date(now.getFullYear(), now.getMonth(), now.getDate() + input.days, 23, 59, 59, 999);
      return requireDb()
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.completed, 0),
            or(isNull(tasks.dueDate), lte(tasks.dueDate, until))
          )
        )
        .orderBy(asc(tasks.dueDate));
    }),
});

