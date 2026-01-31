DROP INDEX "asset_transaction_confirmed_idx";--> statement-breakpoint
DROP INDEX "transaction_confirmed_idx";--> statement-breakpoint
ALTER TABLE "asset_transaction" DROP COLUMN "is_confirmed";--> statement-breakpoint
ALTER TABLE "transaction" DROP COLUMN "is_confirmed";