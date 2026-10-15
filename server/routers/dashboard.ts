import { and, eq, gte, lt, lte } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { db } from "../db";
import {
  assets,
  bankPromotions,
  bills,
  debts,
  insurances,
  installmentPayments,
  installments,
  tasks,
  transactions,
  zakatPayments,
  zakatRecords,
} from "../../drizzle/schema";
import { monthRange } from "../lib/budget";

export const dashboardRouter = router({
  summary: publicProcedure.query(async () => {
    if (!db) return null;
    const now = new Date();
    const { start, end } = monthRange(now);
    const in7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999);

    // Bu ayın gelir/gideri
    const txRows = await db
      .select({ type: transactions.type, amount: transactions.amount })
      .from(transactions)
      .where(and(gte(transactions.date, start), lt(transactions.date, end)));
    const monthIncome = txRows.filter(r => r.type === "income").reduce((s, r) => s + r.amount, 0);
    const monthExpense = txRows.filter(r => r.type === "expense").reduce((s, r) => s + r.amount, 0);

    // Yaklaşan faturalar (7 gün)
    const billRows = await db.select().from(bills).where(eq(bills.isActive, 1));
    const upcomingBills = billRows
      .filter(b => {
        if (!b.nextDueDate) return false;
        const d = new Date(b.nextDueDate + "T12:00:00");
        return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && d <= in7Days;
      })
      .sort((a, b) => (a.nextDueDate! < b.nextDueDate! ? -1 : 1));

    // Taksitler: aktif kalan tutar
    const activeInstallments = await db.select().from(installments).where(eq(installments.isActive, 1));
    const remainingInstallmentTotal = activeInstallments.reduce(
      (s, i) => s + Math.max(0, i.installmentCount - i.paidCount) * i.monthlyAmount,
      0
    );
    // Bu ay ödenmesi gereken taksitler
    const paidThisMonth = await db
      .select({ installmentId: installmentPayments.installmentId, paidDate: installmentPayments.paidDate })
      .from(installmentPayments);
    const paidIdsThisMonth = new Set(
      paidThisMonth
        .filter(p => {
          const d = new Date(p.paidDate + "T12:00:00");
          return d >= start && d < end;
        })
        .map(p => p.installmentId)
    );
    const dueInstallmentsThisMonth = activeInstallments.filter(i => !paidIdsThisMonth.has(i.id));

    // Borç / alacak
    const debtRows = await db.select().from(debts).where(eq(debts.isSettled, 0));
    const totalMyDebt = debtRows.filter(d => d.kind === "debt").reduce((s, d) => s + d.remainingAmount, 0);
    const totalReceivable = debtRows.filter(d => d.kind === "receivable").reduce((s, d) => s + d.remainingAmount, 0);

    // Yaklaşan sigorta/muayene bitişleri
    const insuranceRows = await db.select().from(insurances).where(eq(insurances.isActive, 1));
    const expiringInsurances = insuranceRows.filter(i => {
      if (!i.endDate) return false;
      const d = new Date(i.endDate + "T12:00:00");
      const remindFrom = new Date(d);
      remindFrom.setDate(remindFrom.getDate() - i.reminderDays);
      return remindFrom <= in7Days || d >= now;
    });

    // Zekât (mevcut yıl)
    const year = now.getFullYear();
    const [zakat] = await db.select().from(zakatRecords).where(eq(zakatRecords.year, year));
    const zakatPaidRows = await db.select().from(zakatPayments).where(eq(zakatPayments.year, year));
    const zakatGiven = zakatPaidRows.reduce((s, p) => s + p.amount, 0);

    // Varlıklar
    const assetRows = await db.select().from(assets);
    const totalAssets = assetRows.reduce((s, a) => s + a.currentValue, 0);

    // Promosyon
    const promoRows = await db.select().from(bankPromotions);
    const promoIn = promoRows.filter(p => p.direction === "in").reduce((s, p) => s + p.amount, 0);
    const promoOut = promoRows.filter(p => p.direction === "out").reduce((s, p) => s + p.amount, 0);

    // Yaklaşan görevler
    const taskRows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.completed, 0))
      .orderBy(tasks.dueDate)
      .limit(50);
    const upcomingTasks = taskRows.filter(t => !t.dueDate || new Date(t.dueDate) <= in7Days);

    return {
      monthIncome,
      monthExpense,
      monthNet: monthIncome - monthExpense,
      upcomingBills,
      activeInstallments,
      remainingInstallmentTotal,
      dueInstallmentsThisMonth,
      totalMyDebt,
      totalReceivable,
      expiringInsurances: expiringInsurances.filter(i => {
        if (!i.endDate) return false;
        const d = new Date(i.endDate + "T12:00:00");
        const remindFrom = new Date(d);
        remindFrom.setDate(remindFrom.getDate() - i.reminderDays);
        return remindFrom <= now;
      }),
      zakat: {
        record: zakat ?? null,
        given: zakatGiven,
        remaining: zakat ? Math.max(0, zakat.calculatedAmount - zakatGiven) : 0,
      },
      totalAssets,
      promoIn,
      promoOut,
      upcomingTasks,
    };
  }),
});
