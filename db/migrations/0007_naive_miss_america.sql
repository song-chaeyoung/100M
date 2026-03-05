CREATE TABLE "stock_holding" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"asset_id" integer NOT NULL,
	"stock_code" text NOT NULL,
	"stock_name" text NOT NULL,
	"country" text DEFAULT 'KR' NOT NULL,
	"quantity" integer NOT NULL,
	"avg_price" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'KRW' NOT NULL,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_code" text NOT NULL,
	"stock_name" text NOT NULL,
	"stock_name_en" text,
	"market" text NOT NULL,
	"country" text DEFAULT 'KR' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_price" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_code" text NOT NULL,
	"stock_name" text NOT NULL,
	"market" text NOT NULL,
	"country" text DEFAULT 'KR' NOT NULL,
	"current_price" numeric(12, 2) NOT NULL,
	"previous_close" numeric(12, 2),
	"change_rate" numeric(8, 4),
	"currency" text DEFAULT 'KRW' NOT NULL,
	"krw_price" numeric(16, 0),
	"exchange_rate" numeric(10, 4),
	"price_date" date NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stock_holding" ADD CONSTRAINT "stock_holding_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_holding" ADD CONSTRAINT "stock_holding_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stock_holding_user_idx" ON "stock_holding" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "stock_holding_stock_code_idx" ON "stock_holding" USING btree ("stock_code");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_holding_user_stock_idx" ON "stock_holding" USING btree ("userId","asset_id","stock_code","country");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_master_code_market_idx" ON "stock_master" USING btree ("stock_code","market");--> statement-breakpoint
CREATE INDEX "stock_master_name_idx" ON "stock_master" USING btree ("stock_name");--> statement-breakpoint
CREATE INDEX "stock_master_country_idx" ON "stock_master" USING btree ("country");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_price_code_idx" ON "stock_price" USING btree ("stock_code","country");--> statement-breakpoint
CREATE INDEX "stock_price_date_idx" ON "stock_price" USING btree ("price_date");