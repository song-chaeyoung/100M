ALTER TABLE "asset_transaction" ALTER COLUMN "amount" SET DATA TYPE numeric(12, 0);--> statement-breakpoint
ALTER TABLE "asset" ALTER COLUMN "balance" SET DATA TYPE numeric(12, 0);--> statement-breakpoint
ALTER TABLE "asset" ALTER COLUMN "balance" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "fixed_expense" ALTER COLUMN "amount" SET DATA TYPE numeric(12, 0);--> statement-breakpoint
ALTER TABLE "fixed_saving" ALTER COLUMN "amount" SET DATA TYPE numeric(12, 0);--> statement-breakpoint
ALTER TABLE "goal" ALTER COLUMN "initial_amount" SET DATA TYPE numeric(12, 0);--> statement-breakpoint
ALTER TABLE "goal" ALTER COLUMN "initial_amount" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "goal" ALTER COLUMN "target_amount" SET DATA TYPE numeric(12, 0);--> statement-breakpoint
ALTER TABLE "goal" ALTER COLUMN "target_amount" SET DEFAULT '100000000';--> statement-breakpoint
ALTER TABLE "transaction" ALTER COLUMN "amount" SET DATA TYPE numeric(12, 0);--> statement-breakpoint
ALTER TABLE "asset_transaction" ADD COLUMN "is_confirmed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "is_confirmed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "asset_transaction_confirmed_idx" ON "asset_transaction" USING btree ("is_confirmed");--> statement-breakpoint
CREATE INDEX "transaction_confirmed_idx" ON "transaction" USING btree ("is_confirmed");