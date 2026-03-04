"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { cn, formatAmount } from "@/lib/utils";
import { formatPrice } from "@/lib/stocks/format";
import { buyMoreStockHolding } from "@/app/actions/stocks";
import { toast } from "sonner";
import type { StockHoldingResponse } from "@/lib/validations/stock";

// ─────────────────────────────────────────────
// 폼 스키마
// ─────────────────────────────────────────────

const buyMoreFormSchema = z.object({
  quantity: z
    .string()
    .min(1, "수량을 입력하세요.")
    .refine(
      (v) => {
        const n = Number(v.replace(/,/g, ""));
        return !isNaN(n) && n > 0;
      },
      { message: "수량은 0보다 커야 합니다." },
    ),
  buyPrice: z
    .string()
    .min(1, "매수가를 입력하세요.")
    .refine((v) => Number(v.replace(/,/g, "")) > 0, {
      message: "매수가는 0 초과여야 합니다.",
    }),
  investmentKRW: z.string().min(1, "투자금액을 입력하세요."),
  purchaseDate: z.date(),
});

type BuyMoreFormValues = z.infer<typeof buyMoreFormSchema>;

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface BuyMoreFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holding: StockHoldingResponse | null;
}

// ─────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────

export function BuyMoreFormSheet({
  open,
  onOpenChange,
  holding,
}: BuyMoreFormSheetProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const form = useForm<BuyMoreFormValues>({
    resolver: zodResolver(buyMoreFormSchema),
    defaultValues: {
      quantity: "",
      buyPrice: holding ? String(holding.avgPrice) : "",
      investmentKRW: "",
      purchaseDate: new Date(),
    },
  });

  const { control, handleSubmit, formState, reset, setValue, watch } = form;
  const { isSubmitting, errors } = formState;

  const quantity = watch("quantity");
  const buyPrice = watch("buyPrice");
  const country = holding?.country ?? "KR";

  // KR 주식: 수량 × 매수가 자동계산
  useEffect(() => {
    if (country !== "KR") return;
    const qty = Number(quantity.replace(/,/g, ""));
    const price = Number(buyPrice.replace(/,/g, ""));
    if (qty > 0 && price > 0) {
      setValue("investmentKRW", formatAmount(String(Math.round(qty * price))));
    } else {
      setValue("investmentKRW", "");
    }
  }, [quantity, buyPrice, country, setValue]);

  // 폼 초기화
  useEffect(() => {
    if (open && holding) {
      reset({
        quantity: "",
        buyPrice: String(holding.avgPrice),
        investmentKRW: "",
        purchaseDate: new Date(),
      });
    }
  }, [open, holding, reset]);

  const onSubmit = async (data: BuyMoreFormValues) => {
    if (!holding) return;

    try {
      const result = await buyMoreStockHolding({
        holdingId: holding.id,
        quantity: Number(data.quantity.replace(/,/g, "")),
        buyPrice: Number(data.buyPrice.replace(/,/g, "")),
        investmentKRW: Number(data.investmentKRW.replace(/,/g, "")),
        purchaseDate: dayjs(data.purchaseDate).format("YYYY-MM-DD"),
        categoryId: 3, // 투자 카테고리
      });

      if (result?.success) {
        onOpenChange(false);
        toast.success("추매가 기록되었습니다.");
      } else {
        toast.error(
          typeof result?.error === "string"
            ? result.error
            : "추매 기록에 실패했습니다.",
        );
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    }
  };

  const unitLabel = country === "US" ? "USD" : "원";

  if (!holding) return null;

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="추매"
      description={`${holding.stockName} · 현재 ${holding.quantity.toLocaleString()}주 보유`}
    >
      <div className="space-y-5 py-4">
        {/* 수량 */}
        <div className="space-y-2">
          <Label>
            추가 수량 *
            {country === "US" && (
              <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                (소수점 가능)
              </span>
            )}
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

        {/* 매수가 */}
        <div className="space-y-2">
          <Label>매수가 *</Label>
          <Controller
            name="buyPrice"
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
          {errors.buyPrice && (
            <p className="text-xs text-destructive">
              {errors.buyPrice.message}
            </p>
          )}
        </div>

        {/* 투자금액 (원화) */}
        <div className="space-y-2">
          <Label>
            투자 금액 (원화) *
            {country === "US" && (
              <span className="ml-1 text-xs text-muted-foreground">
                · 직접 입력
              </span>
            )}
          </Label>
          <Controller
            name="investmentKRW"
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
                      ? "수량 × 매수가 자동계산"
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
          {errors.investmentKRW && (
            <p className="text-xs text-destructive">
              {errors.investmentKRW.message}
            </p>
          )}
        </div>

        {/* 날짜 선택 */}
        <div className="space-y-2">
          <Label>매수 날짜 *</Label>
          <Controller
            name="purchaseDate"
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

        {/* 추매 후 평단가 미리보기 */}
        {quantity && buyPrice && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <p className="text-xs text-muted-foreground font-medium">
              추매 후 예상
            </p>
            {(() => {
              const qty = Number(quantity.replace(/,/g, ""));
              const price = Number(buyPrice.replace(/,/g, ""));
              const oldQty = holding.quantity;
              const oldAvg = Number(holding.avgPrice);
              if (qty > 0 && price > 0) {
                const newQty = oldQty + qty;
                const newAvg = (oldQty * oldAvg + qty * price) / newQty;
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">보유 수량</span>
                      <span className="font-medium">
                        {newQty.toLocaleString()}주
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">평단가</span>
                      <span className="font-medium">
                        {formatPrice(newAvg, holding.currency)}
                      </span>
                    </div>
                  </>
                );
              }
              return null;
            })()}
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
            {isSubmitting ? "처리 중..." : "추매 기록하기"}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
