ALTER TABLE "asset"
ADD CONSTRAINT "asset_gold_gram_non_negative"
CHECK ("gold_gram" >= 0);
--> statement-breakpoint
ALTER TABLE "asset"
ADD CONSTRAINT "asset_gold_avg_buy_price_non_negative"
CHECK ("gold_avg_buy_price" >= 0);
--> statement-breakpoint
ALTER TABLE "gold_trade"
ADD CONSTRAINT "gold_trade_gram_positive"
CHECK ("gram" > 0);
--> statement-breakpoint
ALTER TABLE "gold_trade"
ADD CONSTRAINT "gold_trade_price_per_gram_positive"
CHECK ("price_per_gram" > 0);
--> statement-breakpoint
ALTER TABLE "gold_trade"
ADD CONSTRAINT "gold_trade_amount_krw_positive"
CHECK ("amount_krw" > 0);
