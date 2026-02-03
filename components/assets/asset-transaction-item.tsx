"use client";

import { useState, useRef, useCallback } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { AssetTransaction } from "@/lib/validations/asset-transaction";

const TYPE_CONFIG: Record<
  AssetTransaction["type"],
  {
    label: string;
    icon: typeof ArrowDownLeft;
    colorClass: string;
    sign: "+" | "-";
  }
> = {
  DEPOSIT: {
    label: "입금",
    icon: ArrowDownLeft,
    colorClass: "text-blue-500",
    sign: "+",
  },
  WITHDRAW: {
    label: "출금",
    icon: ArrowUpRight,
    colorClass: "text-red-500",
    sign: "-",
  },
  PROFIT: {
    label: "수익",
    icon: TrendingUp,
    colorClass: "text-blue-500",
    sign: "+",
  },
  LOSS: {
    label: "손실",
    icon: TrendingDown,
    colorClass: "text-red-500",
    sign: "-",
  },
  TRANSFER: {
    label: "이체",
    icon: ArrowLeftRight,
    colorClass: "text-orange-500",
    sign: "-",
  },
};

interface AssetTransactionItemProps {
  transaction: AssetTransaction;
  onTap: () => void;
  onDelete: () => void;
}

const SWIPE_THRESHOLD = 80;

export function AssetTransactionItem({
  transaction,
  onTap,
  onDelete,
}: AssetTransactionItemProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const config = TYPE_CONFIG[transaction.type];
  const Icon = config.icon;
  const amount = Number(transaction.amount);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;

    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;

    // 왼쪽으로만 스와이프 허용 (최대 -100px)
    if (diff < 0) {
      setTranslateX(Math.max(diff, -100));
    } else {
      setTranslateX(0);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);

    // 스와이프 거리가 threshold 이상이면 삭제 버튼 노출 유지
    if (translateX < -SWIPE_THRESHOLD) {
      setTranslateX(-80);
    } else {
      setTranslateX(0);
    }
  }, [translateX]);

  const handleClick = useCallback(() => {
    if (translateX < -10) {
      // 스와이프 중이면 닫기
      setTranslateX(0);
    } else {
      onTap();
    }
  }, [translateX, onTap]);

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setTranslateX(0);
      onDelete();
    },
    [onDelete]
  );

  return (
    <div className="relative overflow-hidden rounded-lg" ref={containerRef}>
      {/* 삭제 버튼 배경 */}
      <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center">
        <button
          onClick={handleDeleteClick}
          className="w-full h-full flex items-center justify-center text-white"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* 메인 컨텐츠 */}
      <div
        className={cn(
          "relative bg-card p-4 rounded-lg cursor-pointer transition-transform",
          !isDragging && "duration-200"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        <div className="flex items-center gap-3">
          {/* 아이콘 */}
          <div
            className={cn(
              "w-10 h-10 rounded-full bg-muted flex items-center justify-center",
              config.colorClass
            )}
          >
            <Icon className="h-5 w-5" />
          </div>

          {/* 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{config.label}</span>
              {transaction.isFixed && (
                <Badge variant="outline" className="text-xs">
                  자동
                </Badge>
              )}
            </div>
            {transaction.memo && (
              <p className="text-sm text-muted-foreground truncate">
                {transaction.memo}
              </p>
            )}
          </div>

          {/* 금액 */}
          <div className={cn("text-right font-semibold", config.colorClass)}>
            {config.sign}
            {formatCurrency(amount)}
          </div>
        </div>
      </div>
    </div>
  );
}
