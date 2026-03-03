"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StockHoldingFormSheet } from "@/components/stocks/stock-holding-form-sheet";
import { deleteStockHolding } from "@/app/actions/stocks";
import { toast } from "sonner";
import { Plus, TrendingUp, TrendingDown, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  StockHoldingResponse,
  StockPriceResponse,
} from "@/lib/validations/stock";

interface StockHoldingsListProps {
  assetId: number;
  holdings: StockHoldingResponse[];
  prices: StockPriceResponse[];
  isLoading?: boolean;
}

/**
 * KRW 포맷 (예: 1,234,567원 / $1,234.56)
 */
function formatKRW(amount: number): string {
  return amount.toLocaleString("ko-KR") + "원";
}

function formatUSD(amount: number): string {
  return (
    "$" +
    amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function StockHoldingsList({
  assetId,
  holdings,
  prices,
  isLoading = false,
}: StockHoldingsListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingHolding, setEditingHolding] =
    useState<StockHoldingResponse | null>(null);

  const handleAdd = () => {
    setEditingHolding(null);
    setFormOpen(true);
  };

  const handleEdit = (holding: StockHoldingResponse) => {
    setEditingHolding(holding);
    setFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("보유내역을 삭제하시겠습니까?")) return;
    const result = await deleteStockHolding(id);
    if (result?.success) {
      toast.success("삭제되었습니다.");
    } else {
      toast.error("삭제에 실패했습니다.");
    }
  };

  // 보유내역에 시세 매칭
  const holdingsWithPrices = holdings.map((holding) => {
    const price = prices.find(
      (p) => p.stockCode === holding.stockCode && p.country === holding.country,
    );
    return { holding, price };
  });

  // 총 평가금액 (KRW 기준)
  const totalEvalKRW = holdingsWithPrices.reduce((acc, { holding, price }) => {
    if (!price?.krwPrice) return acc;
    return acc + Number(price.krwPrice) * holding.quantity;
  }, 0);

  // 총 투자금액 (KRW 기준)
  const totalInvestedKRW = holdingsWithPrices.reduce(
    (acc, { holding, price }) => {
      let avgPriceKRW = Number(holding.avgPrice);
      if (holding.currency === "USD" && price?.exchangeRate) {
        avgPriceKRW = avgPriceKRW * Number(price.exchangeRate);
      }
      return acc + avgPriceKRW * holding.quantity;
    },
    0,
  );

  const totalProfitLoss = totalEvalKRW - totalInvestedKRW;
  const totalProfitRate =
    totalInvestedKRW > 0 ? (totalProfitLoss / totalInvestedKRW) * 100 : 0;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 총 평가 요약 */}
      {holdings.length > 0 && (
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">총 평가금액</p>
          <p className="text-xl font-bold">{formatKRW(totalEvalKRW)}</p>
          <div className="flex items-center gap-1.5">
            {totalProfitLoss >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-red-500" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-blue-500" />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                totalProfitLoss > 0 && "text-red-500",
                totalProfitLoss < 0 && "text-blue-500",
                totalProfitLoss === 0 && "text-muted-foreground",
              )}
            >
              {totalProfitLoss >= 0 ? "+" : ""}
              {formatKRW(Math.round(totalProfitLoss))}
              {" ("}
              {totalProfitRate >= 0 ? "+" : ""}
              {totalProfitRate.toFixed(2)}
              {"%)"}
            </span>
          </div>
        </div>
      )}

      {/* 종목 목록 */}
      {holdingsWithPrices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-muted-foreground text-sm">보유 종목이 없습니다.</p>
          <p className="text-muted-foreground text-xs mt-1">
            아래 버튼으로 종목을 추가하세요.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {holdingsWithPrices.map(({ holding, price }) => {
            // 현재가 (KRW 환산)
            const currentPriceKRW = price?.krwPrice
              ? Number(price.krwPrice)
              : null;
            // 평단가 (KRW 환산)
            let avgPriceKRW = Number(holding.avgPrice);
            if (holding.currency === "USD" && price?.exchangeRate) {
              avgPriceKRW = avgPriceKRW * Number(price.exchangeRate);
            }

            const evalAmount =
              currentPriceKRW != null
                ? currentPriceKRW * holding.quantity
                : null;
            const investAmount = avgPriceKRW * holding.quantity;
            const profitLoss =
              evalAmount != null ? evalAmount - investAmount : null;
            const profitRate =
              investAmount > 0 && profitLoss != null
                ? (profitLoss / investAmount) * 100
                : null;

            const changeRate = price?.changeRate
              ? Number(price.changeRate)
              : null;

            return (
              <div
                key={holding.id}
                className="rounded-xl border bg-card p-4 space-y-3"
              >
                {/* 헤더 */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {holding.stockName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {holding.stockCode}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                          holding.country === "US"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700",
                        )}
                      >
                        {holding.country}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {holding.quantity.toLocaleString()}주 보유
                    </p>
                  </div>

                  {/* 현재가 + 등락 */}
                  <div className="text-right">
                    {price ? (
                      <>
                        <p className="text-sm font-medium">
                          {holding.currency === "USD"
                            ? formatUSD(Number(price.currentPrice))
                            : formatKRW(Number(price.currentPrice))}
                        </p>
                        {changeRate != null && (
                          <p
                            className={cn(
                              "text-xs font-medium",
                              changeRate > 0 && "text-red-500",
                              changeRate < 0 && "text-blue-500",
                              changeRate === 0 && "text-muted-foreground",
                            )}
                          >
                            {changeRate > 0 ? "▲" : changeRate < 0 ? "▼" : "─"}{" "}
                            {Math.abs(changeRate).toFixed(2)}%
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">시세 없음</p>
                    )}
                  </div>
                </div>

                {/* 평가금액 / 손익 */}
                {evalAmount != null && profitLoss != null && (
                  <div className="flex justify-between text-sm border-t pt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">평가금액</p>
                      <p className="font-medium">
                        {formatKRW(Math.round(evalAmount))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">손익</p>
                      <p
                        className={cn(
                          "font-medium",
                          profitLoss > 0 && "text-red-500",
                          profitLoss < 0 && "text-blue-500",
                          profitLoss === 0 && "text-foreground",
                        )}
                      >
                        {profitLoss >= 0 ? "+" : ""}
                        {formatKRW(Math.round(profitLoss))}
                        {profitRate != null && (
                          <span className="ml-1 text-xs">
                            ({profitRate >= 0 ? "+" : ""}
                            {profitRate.toFixed(2)}%)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* 평단가 */}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    평단가{" "}
                    <span className="text-foreground font-medium">
                      {holding.currency === "USD"
                        ? formatUSD(Number(holding.avgPrice))
                        : formatKRW(Number(holding.avgPrice))}
                    </span>
                  </span>

                  {/* 수정/삭제 버튼 */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(holding)}
                      className="p-1 hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(holding.id)}
                      className="p-1 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 종목 추가 버튼 */}
      <Button variant="outline" className="w-full" onClick={handleAdd}>
        <Plus className="h-4 w-4 mr-2" />
        종목 추가
      </Button>

      {/* 폼 시트 */}
      <StockHoldingFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        assetId={assetId}
        editingHolding={editingHolding}
      />
    </div>
  );
}
