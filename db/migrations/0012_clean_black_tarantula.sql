CREATE UNIQUE INDEX "asset_id_user_idx" ON "asset" USING btree ("id","userId");
--> statement-breakpoint
ALTER TABLE "gold_trade" DROP CONSTRAINT "gold_trade_asset_id_asset_id_fk";
--> statement-breakpoint
ALTER TABLE "gold_trade" ADD CONSTRAINT "gold_trade_asset_user_fk" FOREIGN KEY ("asset_id","userId") REFERENCES "public"."asset"("id","userId") ON DELETE cascade ON UPDATE no action;
