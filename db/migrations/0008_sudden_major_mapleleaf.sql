ALTER TABLE "stock_holding" ALTER COLUMN "quantity" SET DATA TYPE numeric(12, 6);--> statement-breakpoint
ALTER TABLE "asset" ADD COLUMN "cash_balance" numeric(12, 0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_holding" ADD COLUMN "market" text DEFAULT 'KOSPI' NOT NULL;