"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import type { Asset } from "@/lib/validations/asset";
import type {
  GoldPriceSnapshot,
  GoldTradeResponse,
} from "@/lib/validations/gold";
import { GoldTradeFormSheet } from "./gold-trade-form-sheet";

interface GoldAssetPanelProps {
  asset: Asset;
  trades: GoldTradeResponse[];
  priceSnapshot: GoldPriceSnapshot | null;
  realizedProfitTotal: number;
}

function formatGram(value: number): string {
  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

export function GoldAssetPanel({
  asset,
  trades,
  priceSnapshot,
  realizedProfitTotal,
}: GoldAssetPanelProps) {
  const [buyOpen, setBuyOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);

  const currentGram = Number(asset.goldGram ?? 0);
  const avgBuyPrice = Number(asset.goldAvgBuyPrice ?? 0);
  const currentPricePerGram = priceSnapshot?.pricePerGram ?? null;

  const evalAmount =
    currentPricePerGram != null
      ? Math.round(currentGram * currentPricePerGram)
      : Number(asset.balance);
  const totalCost = Math.round(currentGram * avgBuyPrice);
  const unrealizedProfit = evalAmount - totalCost;
  const unrealizedProfitRate =
    totalCost > 0 ? (unrealizedProfit / totalCost) * 100 : null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">금 자산 요약</h2>
          {priceSnapshot ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                기준일 {priceSnapshot.priceDate}
              </span>
              {priceSnapshot.isStale && (
                <Badge variant="outline" className="text-xs">
                  stale
                </Badge>
              )}
            </div>
          ) : (
            <Badge variant="outline" className="text-xs">
              시세 없음
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">보유 수량</p>
            <p className="mt-1 font-semibold">{formatGram(currentGram)} g</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">평균매입단가</p>
            <p className="mt-1 font-semibold">
              {formatCurrency(Math.round(avgBuyPrice))} / g
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">KRX 현재가</p>
            <p className="mt-1 font-semibold">
              {currentPricePerGram != null
                ? `${formatCurrency(Math.round(currentPricePerGram))} / g`
                : "-"}
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">평가액</p>
            <p className="mt-1 font-semibold">{formatCurrency(evalAmount)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">미실현손익</p>
            <p
              className={cn(
                "mt-1 font-semibold",
                unrealizedProfit > 0 && "text-red-500",
                unrealizedProfit < 0 && "text-blue-500",
              )}
            >
              {formatCurrency(unrealizedProfit, true)}
              {unrealizedProfitRate != null && (
                <span className="ml-1 text-xs">
                  ({unrealizedProfitRate >= 0 ? "+" : ""}
                  {unrealizedProfitRate.toFixed(2)}%)
                </span>
              )}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">실현손익 누적</p>
            <p
              className={cn(
                "mt-1 font-semibold",
                realizedProfitTotal > 0 && "text-red-500",
                realizedProfitTotal < 0 && "text-blue-500",
              )}
            >
              {formatCurrency(realizedProfitTotal, true)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => setBuyOpen(true)}>매수</Button>
        <Button variant="outline" onClick={() => setSellOpen(true)}>
          매도
        </Button>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-semibold">금 거래 내역</h3>
        {trades.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            아직 금 거래 내역이 없습니다.
          </div>
        ) : (
          trades.map((trade) => {
            const isBuy = trade.type === "BUY";
            const realized = Number(trade.realizedProfit ?? 0);

            return (
              <div key={trade.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={isBuy ? "default" : "secondary"}>
                      {isBuy ? "매수" : "매도"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {trade.tradeDate}
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    {formatCurrency(Number(trade.amountKrw))}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <p className="text-muted-foreground">
                    수량{" "}
                    <span className="text-foreground font-medium">
                      {formatGram(Number(trade.gram))}g
                    </span>
                  </p>
                  <p className="text-muted-foreground text-right">
                    단가{" "}
                    <span className="text-foreground font-medium">
                      {formatCurrency(Math.round(Number(trade.pricePerGram)))} / g
                    </span>
                  </p>
                </div>

                {!isBuy && (
                  <p
                    className={cn(
                      "mt-2 text-sm font-medium",
                      realized > 0 && "text-red-500",
                      realized < 0 && "text-blue-500",
                    )}
                  >
                    실현손익 {formatCurrency(realized, true)}
                  </p>
                )}

                {trade.memo && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {trade.memo}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      <GoldTradeFormSheet
        open={buyOpen}
        onOpenChange={setBuyOpen}
        mode="BUY"
        assetId={asset.id}
        currentGram={currentGram}
        avgBuyPrice={avgBuyPrice}
        currentPricePerGram={currentPricePerGram}
      />

      <GoldTradeFormSheet
        open={sellOpen}
        onOpenChange={setSellOpen}
        mode="SELL"
        assetId={asset.id}
        currentGram={currentGram}
        avgBuyPrice={avgBuyPrice}
        currentPricePerGram={currentPricePerGram}
      />
    </div>
  );
}
