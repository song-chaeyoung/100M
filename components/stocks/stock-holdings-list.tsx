"use client";

import { useState, useEffect } from "react";
import { useExchangeRateStore } from "@/store/exchange-rate";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StockHoldingFormSheet } from "@/components/stocks/stock-holding-form-sheet";
import { BuyMoreFormSheet } from "@/components/stocks/buy-more-form-sheet";
import { SellPartialFormSheet } from "@/components/stocks/sell-partial-form-sheet";
import { StockHoldingCard } from "@/components/stocks/stock-holding-card";
import { deleteStockHolding } from "@/app/actions/stocks";
import { toast } from "sonner";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatKRW } from "@/lib/stocks/format";
import { calcTotalStats } from "@/lib/stocks/calc";
import type {
  StockHoldingResponse,
  StockPriceResponse,
} from "@/lib/validations/stock";

interface StockHoldingsListProps {
  assetId: number;
  holdings: StockHoldingResponse[];
  prices: StockPriceResponse[];
  cashBalance?: number;
  isLoading?: boolean;
}

export function StockHoldingsList({
  assetId,
  holdings,
  prices,
  cashBalance = 0,
  isLoading = false,
}: StockHoldingsListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingHolding, setEditingHolding] =
    useState<StockHoldingResponse | null>(null);
  const [buyMoreOpen, setBuyMoreOpen] = useState(false);
  const [buyMoreHolding, setBuyMoreHolding] =
    useState<StockHoldingResponse | null>(null);
  const [sellOpen, setSellOpen] = useState(false);
  const [sellHolding, setSellHolding] = useState<StockHoldingResponse | null>(
    null,
  );

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

  const handleBuyMore = (holding: StockHoldingResponse) => {
    setBuyMoreHolding(holding);
    setBuyMoreOpen(true);
  };

  const handleSellPartial = (holding: StockHoldingResponse) => {
    setSellHolding(holding);
    setSellOpen(true);
  };

  const {
    rate: exchangeRate,
    date: exchangeRateDate,
    fetchRate,
  } = useExchangeRateStore();

  useEffect(() => {
    // 미국 주식이 있을 때만 환율 fetch
    const hasUS = holdings.some((h) => h.country === "US");
    if (hasUS) fetchRate();
  }, [holdings, fetchRate]);

  const holdingsWithPrices = holdings.map((holding) => ({
    holding,
    price: prices.find(
      (p) => p.stockCode === holding.stockCode && p.country === holding.country,
    ),
  }));

  const { totalEvalKRW, totalProfitLoss, totalProfitRate } = calcTotalStats(
    holdingsWithPrices,
    exchangeRate,
  );

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
          <p className="text-xs text-muted-foreground">예수금</p>
          <p className="text-sm font-semibold">{formatKRW(cashBalance)}</p>
          <div className="border-t pt-2 mt-2">
            <p className="text-xs text-muted-foreground">주식 평가금액</p>
            <p className="text-xl font-bold">
              {formatKRW(Math.round(totalEvalKRW))}
            </p>
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
          <div className="border-t pt-2 mt-1 flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              예수금 포함 자산총계
            </p>
            <p className="text-sm font-bold">
              {formatKRW(Math.round(totalEvalKRW) + cashBalance)}
            </p>
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
          {/* 미국 주식 포함 시 환율 기준일 안내 */}
          {holdings.some((h) => h.country === "US") && exchangeRateDate && (
            <p className="text-[11px] text-muted-foreground text-right">
              환율 기준: {exchangeRateDate} (ECB)
            </p>
          )}
          {holdingsWithPrices.map(({ holding, price }) => (
            <StockHoldingCard
              key={holding.id}
              holding={holding}
              price={price}
              fallbackExchangeRate={exchangeRate}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onBuyMore={handleBuyMore}
              onSellPartial={handleSellPartial}
            />
          ))}
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

      {/* 추매 폼 시트 */}
      <BuyMoreFormSheet
        open={buyMoreOpen}
        onOpenChange={setBuyMoreOpen}
        holding={buyMoreHolding}
      />

      {/* 분할매도 폼 시트 */}
      <SellPartialFormSheet
        open={sellOpen}
        onOpenChange={setSellOpen}
        holding={sellHolding}
      />
    </div>
  );
}
