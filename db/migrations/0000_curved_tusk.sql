CREATE TYPE "public"."asset_transaction_type" AS ENUM('DEPOSIT', 'WITHDRAW', 'PROFIT', 'LOSS', 'TRANSFER');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('SAVINGS', 'DEPOSIT', 'STOCK', 'FUND', 'CRYPTO', 'REAL_ESTATE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."category_type" AS ENUM('INCOME', 'EXPENSE', 'SAVING');--> statement-breakpoint
CREATE TYPE "public"."fixed_expense_type" AS ENUM('FIXED', 'ETC');--> statement-breakpoint
CREATE TYPE "public"."method_type" AS ENUM('CARD', 'CASH');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('INCOME', 'EXPENSE', 'SAVING');--> statement-breakpoint
CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "asset_transaction" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"asset_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"type" "asset_transaction_type" NOT NULL,
	"date" date NOT NULL,
	"memo" text,
	"is_fixed" boolean DEFAULT false NOT NULL,
	"fixed_saving_id" integer,
	"to_asset_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"type" "asset_type" NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"institution" text,
	"account_number" text,
	"interest_rate" numeric(5, 2),
	"icon" text,
	"color" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"type" "category_type" NOT NULL,
	"userId" text,
	"order" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixed_expense" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"scheduled_day" integer NOT NULL,
	"type" "fixed_expense_type" NOT NULL,
	"categoryId" integer,
	"method" "method_type" DEFAULT 'CARD' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"start_date" date,
	"end_date" date,
	"last_generated_month" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixed_saving" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"asset_id" integer NOT NULL,
	"title" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"scheduled_day" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"start_date" date,
	"end_date" date,
	"last_generated_month" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"initial_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"target_amount" numeric(12, 2) NOT NULL,
	"start_date" date NOT NULL,
	"target_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"type" "transaction_type" NOT NULL,
	"method" "method_type" DEFAULT 'CARD' NOT NULL,
	"date" date NOT NULL,
	"categoryId" integer,
	"memo" text,
	"is_fixed" boolean DEFAULT false NOT NULL,
	"fixed_expense_id" integer,
	"linked_asset_transaction_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transaction" ADD CONSTRAINT "asset_transaction_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transaction" ADD CONSTRAINT "asset_transaction_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transaction" ADD CONSTRAINT "asset_transaction_fixed_saving_id_fixed_saving_id_fk" FOREIGN KEY ("fixed_saving_id") REFERENCES "public"."fixed_saving"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transaction" ADD CONSTRAINT "asset_transaction_to_asset_id_asset_id_fk" FOREIGN KEY ("to_asset_id") REFERENCES "public"."asset"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_expense" ADD CONSTRAINT "fixed_expense_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_expense" ADD CONSTRAINT "fixed_expense_categoryId_category_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_saving" ADD CONSTRAINT "fixed_saving_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_saving" ADD CONSTRAINT "fixed_saving_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal" ADD CONSTRAINT "goal_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_categoryId_category_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_fixed_expense_id_fixed_expense_id_fk" FOREIGN KEY ("fixed_expense_id") REFERENCES "public"."fixed_expense"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_linked_asset_transaction_id_asset_transaction_id_fk" FOREIGN KEY ("linked_asset_transaction_id") REFERENCES "public"."asset_transaction"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_providerAccountId_idx" ON "account" USING btree ("provider","providerAccountId");--> statement-breakpoint
CREATE INDEX "asset_transaction_user_date_idx" ON "asset_transaction" USING btree ("userId","date");--> statement-breakpoint
CREATE INDEX "asset_transaction_asset_idx" ON "asset_transaction" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_transaction_fixed_saving_idx" ON "asset_transaction" USING btree ("fixed_saving_id");--> statement-breakpoint
CREATE INDEX "asset_user_idx" ON "asset" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "asset_user_active_idx" ON "asset" USING btree ("userId","is_active");--> statement-breakpoint
CREATE INDEX "category_user_type_idx" ON "category" USING btree ("userId","type");--> statement-breakpoint
CREATE INDEX "fixed_expense_user_idx" ON "fixed_expense" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "fixed_expense_active_idx" ON "fixed_expense" USING btree ("is_active","last_generated_month");--> statement-breakpoint
CREATE INDEX "fixed_saving_user_idx" ON "fixed_saving" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "fixed_saving_active_idx" ON "fixed_saving" USING btree ("is_active","last_generated_month");--> statement-breakpoint
CREATE INDEX "goal_user_idx" ON "goal" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "goal_user_active_idx" ON "goal" USING btree ("userId") WHERE is_active = true;--> statement-breakpoint
CREATE INDEX "transaction_user_date_idx" ON "transaction" USING btree ("userId","date");--> statement-breakpoint
CREATE INDEX "transaction_user_month_idx" ON "transaction" USING btree ("userId","date");--> statement-breakpoint
CREATE INDEX "transaction_category_idx" ON "transaction" USING btree ("categoryId");--> statement-breakpoint
CREATE INDEX "transaction_linked_asset_tx_idx" ON "transaction" USING btree ("linked_asset_transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "verificationToken_identifier_token_idx" ON "verificationToken" USING btree ("identifier","token");