"use client";

import { Pencil, Trash2, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatKRW, formatPrice } from "@/lib/stocks/format";
import { calcHoldingStats } from "@/lib/stocks/calc";
import type {
  StockHoldingResponse,
  StockPriceResponse,
} from "@/lib/validations/stock";

interface StockHoldingCardProps {
  holding: StockHoldingResponse;
  price: StockPriceResponse | undefined;
  fallbackExchangeRate?: number | null;
  onEdit: (holding: StockHoldingResponse) => void;
  onDelete: (id: number) => void;
  onBuyMore: (holding: StockHoldingResponse) => void;
}

export function StockHoldingCard({
  holding,
  price,
  fallbackExchangeRate,
  onEdit,
  onDelete,
  onBuyMore,
}: StockHoldingCardProps) {
  const { evalAmount, profitLoss, profitRate, changeRate } = calcHoldingStats(
    holding,
    price,
    fallbackExchangeRate,
  );

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {/* 헤더: 종목명 / 현재가 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{holding.stockName}</span>
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

        {/* 현재가 + 등락률 */}
        <div className="text-right">
          {price ? (
            <>
              <p className="text-sm font-medium">
                {formatPrice(Number(price.currentPrice), holding.currency)}
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
            <p className="font-medium">{formatKRW(Math.round(evalAmount))}</p>
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

      {/* 평단가 / 수정·삭제 버튼 */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          평단가{" "}
          <span className="text-foreground font-medium">
            {formatPrice(Number(holding.avgPrice), holding.currency)}
          </span>
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => onBuyMore(holding)}
            className="p-1 hover:text-foreground transition-colors"
            title="추매"
          >
            <PlusCircle className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onEdit(holding)}
            className="p-1 hover:text-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(holding.id)}
            className="p-1 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
