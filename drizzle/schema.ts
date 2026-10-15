import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Better Auth schema for PostgreSQL
 * These tables are required by Better Auth for authentication
 */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").default("user"), // Optional: "user" or "admin"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Export types for Better Auth user
export type User = typeof user.$inferSelect;
export type InsertUser = typeof user.$inferInsert;

// Legacy alias for backwards compatibility
export const users = user;

// =============================================================================
// AİLE BÜTÇESİ — Uygulama Tabloları
// =============================================================================

import { date, doublePrecision, integer, serial } from "drizzle-orm/pg-core";

/** Aile üyeleri (kim için kayıt tutuluyor) */
export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  relation: text("relation").notNull().default("birey"), // anne, baba, çocuk vb.
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Gelir / gider kategorileri */
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("expense"), // income | expense
  color: text("color").notNull().default("#0f766e"),
  icon: text("icon").notNull().default("tag"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Gelir ve gider işlemleri */
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // income | expense
  amount: doublePrecision("amount").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  memberId: integer("member_id").references(() => members.id, { onDelete: "set null" }),
  paymentMethod: text("payment_method").notNull().default("nakit"), // nakit, kredi kartı, havale, otomatik ödeme...
  date: timestamp("date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Faturalar (elektrik, su, doğalgaz, internet...) */
export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider"),
  amount: doublePrecision("amount").notNull(),
  period: text("period").notNull().default("monthly"), // monthly | quarterly | yearly | once
  dueDay: integer("due_day"), // her ayın kaçı
  nextDueDate: date("next_due_date"),
  isActive: integer("is_active").notNull().default(1),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Fatura ödemeleri */
export const billPayments = pgTable("bill_payments", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id")
    .notNull()
    .references(() => bills.id, { onDelete: "cascade" }),
  amount: doublePrecision("amount").notNull(),
  paidDate: date("paid_date").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Borçlar ve alacaklar */
export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull().default("debt"), // debt = bizim borcumuz | receivable = bize olan alacak
  counterparty: text("counterparty").notNull(), // kişi veya kurum
  description: text("description"),
  totalAmount: doublePrecision("total_amount").notNull(),
  remainingAmount: doublePrecision("remaining_amount").notNull(),
  dueDate: date("due_date"),
  isSettled: integer("is_settled").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Borç/alacak ödeme (tahsilat) hareketleri */
export const debtPayments = pgTable("debt_payments", {
  id: serial("id").primaryKey(),
  debtId: integer("debt_id")
    .notNull()
    .references(() => debts.id, { onDelete: "cascade" }),
  amount: doublePrecision("amount").notNull(),
  paidDate: date("paid_date").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Taksitli alışverişler ve krediler */
export const installments = pgTable("installments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  place: text("place"), // mağaza / banka
  totalAmount: doublePrecision("total_amount").notNull(),
  installmentCount: integer("installment_count").notNull(),
  paidCount: integer("paid_count").notNull().default(0),
  monthlyAmount: doublePrecision("monthly_amount").notNull(),
  startDate: date("start_date"),
  isActive: integer("is_active").notNull().default(1),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Taksit ödemeleri */
export const installmentPayments = pgTable("installment_payments", {
  id: serial("id").primaryKey(),
  installmentId: integer("installment_id")
    .notNull()
    .references(() => installments.id, { onDelete: "cascade" }),
  installmentNo: integer("installment_no").notNull(),
  amount: doublePrecision("amount").notNull(),
  paidDate: date("paid_date").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Sigorta, kasko ve araç muayene takibi */
export const insurances = pgTable("insurances", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull().default("sigorta"), // sigorta | kasko | muayene | diger
  holder: text("holder"), // araç plakası veya sigortalı kişi
  provider: text("provider"),
  policyNo: text("policy_no"),
  amount: doublePrecision("amount"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  reminderDays: integer("reminder_days").notNull().default(15),
  isActive: integer("is_active").notNull().default(1),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Zekat hesaplaması (yıllık) */
export const zakatRecords = pgTable("zakat_records", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  totalWealth: doublePrecision("total_wealth").notNull().default(0), // zekâta tabi mal varlığı
  goldPricePerGram: doublePrecision("gold_price_per_gram"),
  nisabAmount: doublePrecision("nisab_amount"), // 85 gram altın karşılığı
  calculatedAmount: doublePrecision("calculated_amount").notNull().default(0), // malın %2,5'i
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Verilen zekât ödemeleri */
export const zakatPayments = pgTable("zakat_payments", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  amount: doublePrecision("amount").notNull(),
  paidDate: date("paid_date").notNull(),
  recipient: text("recipient"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Banka promosyonları — gelen ve giden */
export const bankPromotions = pgTable("bank_promotions", {
  id: serial("id").primaryKey(),
  bank: text("bank").notNull(),
  direction: text("direction").notNull().default("in"), // in = gelen | out = giden
  kind: text("kind").notNull().default("maas_promosyonu"), // maas_promosyonu | odul_puan | komisyon | diger
  amount: doublePrecision("amount").notNull(),
  date: date("date").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Birikimler ve varlıklar — döviz, altın, taşınmaz, taşınır, nakit */
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull().default("doviz"), // doviz | altin | tasinmaz | tasinir | nakit | diger
  name: text("name").notNull(),
  quantity: doublePrecision("quantity").notNull().default(1),
  unit: text("unit").notNull().default("TL"), // gram, adet, TL, USD, EUR...
  purchaseValue: doublePrecision("purchase_value").notNull().default(0), // TL cinsinden
  currentValue: doublePrecision("current_value").notNull().default(0), // TL cinsinden
  purchaseDate: date("purchase_date"),
  location: text("location"), // nerede saklanıyor
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Kurs kayıtları (kendim ve çocuklar) */
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  person: text("person").notNull(), // katılımcı adı
  courseName: text("course_name").notNull(),
  institution: text("institution"),
  instructor: text("instructor"),
  days: text("days").notNull().default(""), // "Pazartesi, Çarşamba"
  time: text("time"), // "18:00 - 19:30"
  feeAmount: doublePrecision("fee_amount").notNull().default(0),
  feePeriod: text("fee_period").notNull().default("monthly"), // monthly | per_lesson | per_term
  startDate: date("start_date"),
  endDate: date("end_date"),
  isActive: integer("is_active").notNull().default(1),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Kurs ücreti ödemeleri */
export const coursePayments = pgTable("course_payments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  amount: doublePrecision("amount").notNull(),
  paidDate: date("paid_date").notNull(),
  periodLabel: text("period_label"), // "Ekim 2026" vb.
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Görevler ve hatırlatmalar — günlük / haftalık / aylık tekrarlı */
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  kind: text("kind").notNull().default("task"), // task | reminder
  repeat: text("repeat").notNull().default("none"), // none | daily | weekly | monthly | yearly
  priority: text("priority").notNull().default("normal"), // low | normal | high
  dueDate: timestamp("due_date"),
  completed: integer("completed").notNull().default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Member = typeof members.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type BillPayment = typeof billPayments.$inferSelect;
export type Debt = typeof debts.$inferSelect;
export type DebtPayment = typeof debtPayments.$inferSelect;
export type Installment = typeof installments.$inferSelect;
export type InstallmentPayment = typeof installmentPayments.$inferSelect;
export type Insurance = typeof insurances.$inferSelect;
export type ZakatRecord = typeof zakatRecords.$inferSelect;
export type ZakatPayment = typeof zakatPayments.$inferSelect;
export type BankPromotion = typeof bankPromotions.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type CoursePayment = typeof coursePayments.$inferSelect;
export type Task = typeof tasks.$inferSelect;
