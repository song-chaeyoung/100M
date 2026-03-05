"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { Calendar as CalendarIcon } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, formatAmount, parseFormattedNumber } from "@/lib/utils";
import { formatPrice, formatKRW } from "@/lib/stocks/format";
import { sellPartialStockHolding } from "@/app/actions/stocks";
import { toast } from "sonner";
import {
  type StockHoldingResponse,
  sellPartialFormSchema,
  type SellPartialFormValues,
} from "@/lib/validations/stock";

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface SellPartialFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holding: StockHoldingResponse | null;
}

// ─────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────

export function SellPartialFormSheet({
  open,
  onOpenChange,
  holding,
}: SellPartialFormSheetProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const form = useForm<SellPartialFormValues>({
    resolver: zodResolver(sellPartialFormSchema),
    defaultValues: {
      quantity: "",
      sellPrice: holding ? String(holding.avgPrice) : "",
      proceedsKRW: "",
      sellDate: new Date(),
    },
  });

  const { control, handleSubmit, formState, reset, setValue, watch } = form;
  const { isSubmitting, errors } = formState;

  const quantity = watch("quantity");
  const sellPrice = watch("sellPrice");
  const country = holding?.country ?? "KR";

  // KR 주식: 수량 × 매도가 자동계산
  useEffect(() => {
    if (country !== "KR") return;
    const qty = parseFormattedNumber(quantity);
    const price = parseFormattedNumber(sellPrice);
    if (qty > 0 && price > 0) {
      setValue("proceedsKRW", formatAmount(String(Math.round(qty * price))));
    } else {
      setValue("proceedsKRW", "");
    }
  }, [quantity, sellPrice, country, setValue]);

  // 폼 초기화
  useEffect(() => {
    if (open && holding) {
      reset({
        quantity: "",
        sellPrice: String(holding.avgPrice),
        proceedsKRW: "",
        sellDate: new Date(),
      });
    }
  }, [open, holding, reset]);

  const onSubmit = async (data: SellPartialFormValues) => {
    if (!holding) return;

    const sellQty = parseFormattedNumber(data.quantity);
    const maxQty = holding.quantity;

    // 보유 수량 초과 검증 (클라이언트)
    if (sellQty > maxQty) {
      toast.error(`매도 수량(${sellQty})이 보유 수량(${maxQty})을 초과합니다.`);
      return;
    }

    try {
      const result = await sellPartialStockHolding({
        holdingId: holding.id,
        quantity: sellQty,
        sellPrice: parseFormattedNumber(data.sellPrice),
        proceedsKRW: parseFormattedNumber(data.proceedsKRW),
        sellDate: dayjs(data.sellDate).format("YYYY-MM-DD"),
      });

      if (result?.success) {
        onOpenChange(false);
        toast.success("매도가 기록되었습니다.");
      } else {
        toast.error(
          typeof result?.error === "string"
            ? result.error
            : "매도 기록에 실패했습니다.",
        );
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    }
  };

  const unitLabel = country === "US" ? "USD" : "원";

  if (!holding) return null;

  // 미리보기 계산
  const previewQty = parseFormattedNumber(quantity);
  const previewPrice = parseFormattedNumber(sellPrice);
  const avgPrice = Number(holding.avgPrice);
  const showPreview =
    previewQty > 0 && previewPrice > 0 && previewQty <= holding.quantity;
  const remainQty = holding.quantity - previewQty;
  const profitPerShare = previewPrice - avgPrice;
  const totalProfit = profitPerShare * previewQty;
  const profitRate = avgPrice > 0 ? (profitPerShare / avgPrice) * 100 : 0;

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="분할매도"
      description={`${holding.stockName} · 현재 ${holding.quantity.toLocaleString()}주 보유`}
    >
      <div className="space-y-5 py-4">
        {/* 수량 */}
        <div className="space-y-2">
          <Label>
            매도 수량 *
            {country === "US" && (
              <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                (소수점 가능)
              </span>
            )}
            <span className="ml-1.5 text-xs text-muted-foreground font-normal">
              최대 {holding.quantity.toLocaleString()}주
            </span>
          </Label>
          <Controller
            name="quantity"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <Input
                  type="text"
                  inputMode={country === "US" ? "decimal" : "numeric"}
                  value={field.value}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (country === "US") {
                      if (/^\d*\.?\d{0,6}$/.test(raw)) field.onChange(raw);
                    } else {
                      field.onChange(formatAmount(raw));
                    }
                  }}
                  placeholder={country === "US" ? "0.5" : "0"}
                  className="text-right pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  주
                </span>
              </div>
            )}
          />
          {errors.quantity && (
            <p className="text-xs text-destructive">
              {errors.quantity.message}
            </p>
          )}
        </div>

        {/* 매도가 */}
        <div className="space-y-2">
          <Label>매도가 *</Label>
          <Controller
            name="sellPrice"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder={formatPrice(
                    Number(holding.avgPrice),
                    holding.currency,
                  )}
                  className="text-right pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {unitLabel}
                </span>
              </div>
            )}
          />
          {errors.sellPrice && (
            <p className="text-xs text-destructive">
              {errors.sellPrice.message}
            </p>
          )}
        </div>

        {/* 매도 대금 (원화) */}
        <div className="space-y-2">
          <Label>
            매도 대금 (원화) *
            {country === "US" && (
              <span className="ml-1 text-xs text-muted-foreground">
                · 직접 입력
              </span>
            )}
          </Label>
          <Controller
            name="proceedsKRW"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={field.value}
                  onChange={(e) => field.onChange(formatAmount(e.target.value))}
                  placeholder={
                    country === "KR"
                      ? "수량 × 매도가 자동계산"
                      : "원화 환산 금액"
                  }
                  className="text-right pr-8"
                  readOnly={country === "KR"}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  원
                </span>
              </div>
            )}
          />
          {errors.proceedsKRW && (
            <p className="text-xs text-destructive">
              {errors.proceedsKRW.message}
            </p>
          )}
        </div>

        {/* 날짜 선택 */}
        <div className="space-y-2">
          <Label>매도 날짜 *</Label>
          <Controller
            name="sellDate"
            control={control}
            render={({ field }) => (
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value
                      ? dayjs(field.value).format("YYYY년 M월 D일 (ddd)")
                      : "날짜 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                      field.onChange(date);
                      setCalendarOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            )}
          />
        </div>

        {/* 매도 후 미리보기 */}
        {showPreview && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <p className="text-xs text-muted-foreground font-medium">
              매도 후 예상
            </p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">남은 수량</span>
              <span className="font-medium">
                {remainQty <= 0 ? (
                  <span className="text-destructive">전량 매도</span>
                ) : (
                  `${remainQty.toLocaleString()}주`
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">예상 실현 손익</span>
              <span
                className={cn(
                  "font-medium",
                  totalProfit > 0 && "text-red-500",
                  totalProfit < 0 && "text-blue-500",
                  totalProfit === 0 && "text-foreground",
                )}
              >
                {totalProfit >= 0 ? "+" : ""}
                {formatKRW(Math.round(totalProfit))}
                <span className="ml-1 text-xs">
                  ({profitRate >= 0 ? "+" : ""}
                  {profitRate.toFixed(2)}%)
                </span>
              </span>
            </div>
          </div>
        )}

        {/* 등록 버튼 */}
        <div className="pt-2">
          <Button
            onClick={handleSubmit(onSubmit)}
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? "처리 중..." : "매도 기록하기"}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
