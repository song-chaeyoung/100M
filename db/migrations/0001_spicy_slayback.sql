ALTER TABLE "transaction" ALTER COLUMN "method" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "transaction" ALTER COLUMN "method" DROP NOT NULL;