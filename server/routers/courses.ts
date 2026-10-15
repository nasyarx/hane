import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { coursePayments, courses, transactions } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

const requireDb = () => {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Veritabanı bağlantısı yok" });
  return db;
};

export const coursesRouter = router({
  list: publicProcedure.query(async () => {
    const rows = await requireDb().select().from(courses).orderBy(desc(courses.isActive), courses.person);
    const payments = await requireDb().select().from(coursePayments).orderBy(desc(coursePayments.paidDate));
    return rows.map(c => {
      const paid = payments.filter(p => p.courseId === c.id).reduce((s, p) => s + p.amount, 0);
      return { ...c, payments: payments.filter(p => p.courseId === c.id), paidTotal: paid };
    });
  }),

  create: publicProcedure
    .input(
      z.object({
        person: z.string().min(1),
        courseName: z.string().min(1),
        institution: z.string().optional(),
        instructor: z.string().optional(),
        days: z.string().default(""),
        time: z.string().optional(),
        feeAmount: z.number().nonnegative().default(0),
        feePeriod: z.enum(["monthly", "per_lesson", "per_term"]).default("monthly"),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [row] = await requireDb().insert(courses).values(input).returning();
      return row;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        person: z.string().min(1).optional(),
        courseName: z.string().min(1).optional(),
        institution: z.string().nullable().optional(),
        instructor: z.string().nullable().optional(),
        days: z.string().optional(),
        time: z.string().nullable().optional(),
        feeAmount: z.number().nonnegative().optional(),
        feePeriod: z.enum(["monthly", "per_lesson", "per_term"]).optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
        isActive: z.number().optional(),
        note: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [row] = await requireDb().update(courses).set(data).where(eq(courses.id, id)).returning();
      return row;
    }),

  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await requireDb().delete(courses).where(eq(courses.id, input.id));
    return { success: true };
  }),

  /** Kurs ücreti ödemesi kaydet + isteğe bağlı gider işlemi */
  pay: publicProcedure
    .input(
      z.object({
        courseId: z.number(),
        amount: z.number().positive(),
        paidDate: z.string(),
        periodLabel: z.string().optional(),
        createTransaction: z.boolean().default(true),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const database = requireDb();
      const [course] = await database.select().from(courses).where(eq(courses.id, input.courseId));
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Kurs bulunamadı" });

      const [payment] = await database
        .insert(coursePayments)
        .values({
          courseId: input.courseId,
          amount: input.amount,
          paidDate: input.paidDate,
          periodLabel: input.periodLabel,
          note: input.note,
        })
        .returning();

      if (input.createTransaction) {
        await database.insert(transactions).values({
          type: "expense",
          amount: input.amount,
          title: `Kurs ücreti: ${course.courseName} (${course.person})`,
          description: input.periodLabel ?? undefined,
          paymentMethod: "nakit",
          date: new Date(input.paidDate + "T12:00:00"),
        });
      }

      return payment;
    }),

  deletePayment: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await requireDb().delete(coursePayments).where(eq(coursePayments.id, input.id));
    return { success: true };
  }),
});
