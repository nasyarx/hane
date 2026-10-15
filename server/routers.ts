import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { metaRouter } from "./routers/meta";
import { transactionsRouter } from "./routers/transactions";
import { billsRouter } from "./routers/bills";
import { debtsRouter } from "./routers/debts";
import { installmentsRouter } from "./routers/installments";
import { insurancesRouter } from "./routers/insurances";
import { zakatRouter } from "./routers/zakat";
import { promotionsRouter } from "./routers/promotions";
import { assetsRouter } from "./routers/assets";
import { coursesRouter } from "./routers/courses";
import { tasksRouter } from "./routers/tasks";
import { dashboardRouter } from "./routers/dashboard";

export const appRouter = router({
  system: systemRouter,

  dashboard: dashboardRouter,
  meta: metaRouter,
  transactions: transactionsRouter,
  bills: billsRouter,
  debts: debtsRouter,
  installments: installmentsRouter,
  insurances: insurancesRouter,
  zakat: zakatRouter,
  promotions: promotionsRouter,
  assets: assetsRouter,
  courses: coursesRouter,
  tasks: tasksRouter,
});

export type AppRouter = typeof appRouter;
