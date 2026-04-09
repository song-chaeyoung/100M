CREATE TYPE "public"."gold_trade_type" AS ENUM('BUY', 'SELL');--> statement-breakpoint
ALTER TYPE "public"."asset_type" ADD VALUE 'GOLD' BEFORE 'FUND';--> statement-breakpoint
CREATE TABLE "gold_price" (
	"id" serial PRIMARY KEY NOT NULL,
	"price_per_gram" numeric(16, 2) NOT NULL,
	"price_date" date NOT NULL,
	"source" text DEFAULT 'KRX_OPEN_API' NOT NULL,
	"raw_payload" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gold_trade" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"asset_id" integer NOT NULL,
	"type" "gold_trade_type" NOT NULL,
	"gram" numeric(12, 6) NOT NULL,
	"price_per_gram" numeric(16, 2) NOT NULL,
	"amount_krw" numeric(16, 0) NOT NULL,
	"realized_profit" numeric(16, 0),
	"trade_date" date NOT NULL,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset" ADD COLUMN "gold_gram" numeric(12, 6) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "asset" ADD COLUMN "gold_avg_buy_price" numeric(16, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "gold_trade" ADD CONSTRAINT "gold_trade_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gold_trade" ADD CONSTRAINT "gold_trade_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gold_price_date_idx" ON "gold_price" USING btree ("price_date");--> statement-breakpoint
CREATE INDEX "gold_price_updated_at_idx" ON "gold_price" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "gold_trade_user_date_idx" ON "gold_trade" USING btree ("userId","trade_date");--> statement-breakpoint
CREATE INDEX "gold_trade_asset_date_idx" ON "gold_trade" USING btree ("asset_id","trade_date");--> statement-breakpoint
CREATE INDEX "gold_trade_user_asset_type_idx" ON "gold_trade" USING btree ("userId","asset_id","type");