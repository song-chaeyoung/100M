"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import { Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
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
import { cn, formatCurrency } from "@/lib/utils";
import { createGoldBuy, createGoldSell } from "@/app/actions/gold";

const goldTradeFormSchema = z.object({
  gram: z
    .string()
    .min(1, "gram을 입력하세요")
    .refine((value) => /^\d+(\.\d{1,6})?$/.test(value.replace(/,/g, "")), {
      message: "gram은 소수점 6자리까지 입력할 수 있습니다",
    })
    .refine((value) => Number(value.replace(/,/g, "")) > 0, {
      message: "gram은 0보다 커야 합니다",
    }),
  pricePerGram: z
    .string()
    .min(1, "단가를 입력하세요")
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value.replace(/,/g, "")), {
      message: "단가는 소수점 2자리까지 입력할 수 있습니다",
    })
    .refine((value) => Number(value.replace(/,/g, "")) > 0, {
      message: "단가는 0보다 커야 합니다",
    }),
  tradeDate: z.date(),
  memo: z.string().optional(),
});

type GoldTradeFormValues = z.infer<typeof goldTradeFormSchema>;

interface GoldTradeFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "BUY" | "SELL";
  assetId: number;
  currentGram: number;
  avgBuyPrice: number;
  currentPricePerGram?: number | null;
}

function parseNumber(value: string): number {
  return Number(value.replace(/,/g, "")) || 0;
}

function formatNumber(value: number, digits: number): string {
  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export function GoldTradeFormSheet({
  open,
  onOpenChange,
  mode,
  assetId,
  currentGram,
  avgBuyPrice,
  currentPricePerGram,
}: GoldTradeFormSheetProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const form = useForm<GoldTradeFormValues>({
    resolver: zodResolver(goldTradeFormSchema),
    defaultValues: {
      gram: "",
      pricePerGram:
        currentPricePerGram != null
          ? String(currentPricePerGram)
          : avgBuyPrice > 0
            ? String(avgBuyPrice)
            : "",
      tradeDate: new Date(),
      memo: "",
    },
  });

  const { control, handleSubmit, watch, reset, formState } = form;
  const { errors, isSubmitting } = formState;

  const gram = watch("gram");
  const pricePerGram = watch("pricePerGram");

  useEffect(() => {
    if (!open) return;

    reset({
      gram: "",
      pricePerGram:
        currentPricePerGram != null
          ? String(currentPricePerGram)
          : avgBuyPrice > 0
            ? String(avgBuyPrice)
            : "",
      tradeDate: new Date(),
      memo: "",
    });
  }, [open, reset, currentPricePerGram, avgBuyPrice]);

  const parsedGram = useMemo(() => parseNumber(gram || "0"), [gram]);
  const parsedPrice = useMemo(
    () => parseNumber(pricePerGram || "0"),
    [pricePerGram],
  );
  const estimatedAmount = Math.round(parsedGram * parsedPrice);

  const onSubmit = async (values: GoldTradeFormValues) => {
    try {
      const gramNumber = parseNumber(values.gram);
      const priceNumber = parseNumber(values.pricePerGram);

      if (mode === "SELL" && gramNumber > currentGram) {
        toast.error(
          `매도 수량(${formatNumber(gramNumber, 6)}g)이 보유 수량(${formatNumber(currentGram, 6)}g)을 초과합니다.`,
        );
        return;
      }

      const tradeDate = dayjs(values.tradeDate).format("YYYY-MM-DD");

      const result =
        mode === "BUY"
          ? await createGoldBuy({
              assetId,
              type: "BUY",
              gram: gramNumber,
              pricePerGram: priceNumber,
              tradeDate,
              memo: values.memo,
            })
          : await createGoldSell({
              assetId,
              type: "SELL",
              gram: gramNumber,
              pricePerGram: priceNumber,
              tradeDate,
              memo: values.memo,
            });

      if (result?.success) {
        onOpenChange(false);
        toast.success(mode === "BUY" ? "금 매수 기록 완료" : "금 매도 기록 완료");
      } else {
        toast.error(
          typeof result?.error === "string"
            ? result.error
            : mode === "BUY"
              ? "금 매수 기록에 실패했습니다."
              : "금 매도 기록에 실패했습니다.",
        );
      }
    } catch (error) {
      console.error("gold trade submit error", error);
      toast.error("오류가 발생했습니다.");
    }
  };

  const title = mode === "BUY" ? "금 매수" : "금 매도";
  const buttonLabel = mode === "BUY" ? "매수 기록하기" : "매도 기록하기";

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={`현재 보유 ${formatNumber(currentGram, 6)}g`}
    >
      <div className="space-y-5 py-4">
        <div className="space-y-2">
          <Label>
            수량 (gram) *
            {mode === "SELL" && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                최대 {formatNumber(currentGram, 6)}g
              </span>
            )}
          </Label>
          <Controller
            name="gram"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={field.value || ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, "");
                    if (/^\d*\.?\d{0,6}$/.test(raw)) field.onChange(raw);
                  }}
                  placeholder="예: 2.5"
                  className="text-right pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  g
                </span>
              </div>
            )}
          />
          {errors.gram && (
            <p className="text-xs text-destructive">{errors.gram.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>단가 (원/g) *</Label>
          <Controller
            name="pricePerGram"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={field.value || ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, "");
                    if (/^\d*\.?\d{0,2}$/.test(raw)) field.onChange(raw);
                  }}
                  placeholder="예: 145000"
                  className="text-right pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  원/g
                </span>
              </div>
            )}
          />
          {errors.pricePerGram && (
            <p className="text-xs text-destructive">
              {errors.pricePerGram.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>거래 날짜 *</Label>
          <Controller
            name="tradeDate"
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

        <div className="space-y-2">
          <Label>메모 (선택)</Label>
          <Controller
            name="memo"
            control={control}
            render={({ field }) => (
              <Input
                value={field.value || ""}
                onChange={field.onChange}
                placeholder={mode === "BUY" ? "예: 추가 매수" : "예: 부분 매도"}
              />
            )}
          />
        </div>

        {parsedGram > 0 && parsedPrice > 0 && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">예상 거래금액</span>
              <span className="font-semibold">{formatCurrency(estimatedAmount)}</span>
            </div>
            {mode === "BUY" && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">거래 후 예상 평단가</span>
                <span className="font-medium">
                  {currentGram + parsedGram > 0
                    ? formatNumber(
                        (currentGram * avgBuyPrice + parsedGram * parsedPrice) /
                          (currentGram + parsedGram),
                        2,
                      )
                    : "0"}
                  원/g
                </span>
              </div>
            )}
            {mode === "SELL" && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">예상 실현손익</span>
                <span className="font-medium">
                  {formatCurrency(
                    Math.round((parsedPrice - avgBuyPrice) * parsedGram),
                    true,
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="pt-2">
          <Button
            onClick={handleSubmit(onSubmit)}
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? "처리 중..." : buttonLabel}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
