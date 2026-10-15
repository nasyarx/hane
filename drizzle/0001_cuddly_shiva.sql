CREATE TABLE "assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text DEFAULT 'doviz' NOT NULL,
	"name" text NOT NULL,
	"quantity" double precision DEFAULT 1 NOT NULL,
	"unit" text DEFAULT 'TL' NOT NULL,
	"purchase_value" double precision DEFAULT 0 NOT NULL,
	"current_value" double precision DEFAULT 0 NOT NULL,
	"purchase_date" date,
	"location" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_promotions" (
	"id" serial PRIMARY KEY NOT NULL,
	"bank" text NOT NULL,
	"direction" text DEFAULT 'in' NOT NULL,
	"kind" text DEFAULT 'maas_promosyonu' NOT NULL,
	"amount" double precision NOT NULL,
	"date" date NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"bill_id" integer NOT NULL,
	"amount" double precision NOT NULL,
	"paid_date" date NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"provider" text,
	"amount" double precision NOT NULL,
	"period" text DEFAULT 'monthly' NOT NULL,
	"due_day" integer,
	"next_due_date" date,
	"is_active" integer DEFAULT 1 NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'expense' NOT NULL,
	"color" text DEFAULT '#0f766e' NOT NULL,
	"icon" text DEFAULT 'tag' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"amount" double precision NOT NULL,
	"paid_date" date NOT NULL,
	"period_label" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"person" text NOT NULL,
	"course_name" text NOT NULL,
	"institution" text,
	"instructor" text,
	"days" text DEFAULT '' NOT NULL,
	"time" text,
	"fee_amount" double precision DEFAULT 0 NOT NULL,
	"fee_period" text DEFAULT 'monthly' NOT NULL,
	"start_date" date,
	"end_date" date,
	"is_active" integer DEFAULT 1 NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debt_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"debt_id" integer NOT NULL,
	"amount" double precision NOT NULL,
	"paid_date" date NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text DEFAULT 'debt' NOT NULL,
	"counterparty" text NOT NULL,
	"description" text,
	"total_amount" double precision NOT NULL,
	"remaining_amount" double precision NOT NULL,
	"due_date" date,
	"is_settled" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installment_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"installment_id" integer NOT NULL,
	"installment_no" integer NOT NULL,
	"amount" double precision NOT NULL,
	"paid_date" date NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installments" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"place" text,
	"total_amount" double precision NOT NULL,
	"installment_count" integer NOT NULL,
	"paid_count" integer DEFAULT 0 NOT NULL,
	"monthly_amount" double precision NOT NULL,
	"start_date" date,
	"is_active" integer DEFAULT 1 NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insurances" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text DEFAULT 'sigorta' NOT NULL,
	"holder" text,
	"provider" text,
	"policy_no" text,
	"amount" double precision,
	"start_date" date,
	"end_date" date,
	"reminder_days" integer DEFAULT 15 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"relation" text DEFAULT 'birey' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"kind" text DEFAULT 'task' NOT NULL,
	"repeat" text DEFAULT 'none' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"due_date" timestamp,
	"completed" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"amount" double precision NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category_id" integer,
	"member_id" integer,
	"payment_method" text DEFAULT 'nakit' NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zakat_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"amount" double precision NOT NULL,
	"paid_date" date NOT NULL,
	"recipient" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zakat_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"total_wealth" double precision DEFAULT 0 NOT NULL,
	"gold_price_per_gram" double precision,
	"nisab_amount" double precision,
	"calculated_amount" double precision DEFAULT 0 NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bill_payments" ADD CONSTRAINT "bill_payments_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_payments" ADD CONSTRAINT "course_payments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installment_payments" ADD CONSTRAINT "installment_payments_installment_id_installments_id_fk" FOREIGN KEY ("installment_id") REFERENCES "public"."installments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;