"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StockSearchInput } from "@/components/stocks/stock-search-input";
import { formatAmount } from "@/lib/utils";
import { createStockHolding, updateStockHolding } from "@/app/actions/stocks";
import { toast } from "sonner";
import {
  stockHoldingFormSchema,
  type StockHoldingFormValues,
  type StockSearchResult,
  type StockHoldingResponse,
} from "@/lib/validations/stock";

interface StockHoldingFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: number;
  editingHolding?: StockHoldingResponse | null;
}

export function StockHoldingFormSheet({
  open,
  onOpenChange,
  assetId,
  editingHolding,
}: StockHoldingFormSheetProps) {
  const isEditMode = !!editingHolding;

  const form = useForm<StockHoldingFormValues>({
    resolver: zodResolver(stockHoldingFormSchema),
    defaultValues: {
      assetId,
      stockCode: "",
      stockName: "",
      country: "KR",
      market: "KOSPI",
      quantity: "",
      avgPrice: "",
      memo: "",
    },
  });

  const { control, handleSubmit, formState, reset, setValue, watch } = form;
  const { isDirty, isSubmitting, errors } = formState;

  const stockCode = watch("stockCode");
  const country = watch("country");

  // 선택된 종목을 StockSearchResult 형태로 변환 (표시용)
  const selectedStock: StockSearchResult | null = stockCode
    ? {
        stockCode: watch("stockCode"),
        stockName: watch("stockName"),
        stockNameEn: null,
        market: watch("market"),
        country: watch("country"),
      }
    : null;

  useEffect(() => {
    if (open) {
      if (editingHolding) {
        reset({
          assetId,
          stockCode: editingHolding.stockCode,
          stockName: editingHolding.stockName,
          country: editingHolding.country as "KR" | "US",
          market: editingHolding.country === "US" ? "NYSE" : "KOSPI",
          quantity: String(editingHolding.quantity),
          avgPrice: editingHolding.avgPrice,
          memo: editingHolding.memo ?? "",
        });
      } else {
        reset({
          assetId,
          stockCode: "",
          stockName: "",
          country: "KR",
          market: "KOSPI",
          quantity: "",
          avgPrice: "",
          memo: "",
        });
      }
    }
  }, [open, editingHolding, assetId, reset]);

  const handleStockSelect = (stock: StockSearchResult | null) => {
    if (stock) {
      setValue("stockCode", stock.stockCode, { shouldDirty: true });
      setValue("stockName", stock.stockName, { shouldDirty: true });
      setValue("country", stock.country as "KR" | "US", { shouldDirty: true });
      setValue("market", stock.market, { shouldDirty: true });
    } else {
      setValue("stockCode", "", { shouldDirty: true });
      setValue("stockName", "", { shouldDirty: true });
      setValue("country", "KR", { shouldDirty: true });
      setValue("market", "KOSPI", { shouldDirty: true });
    }
  };

  const onSubmit = async (data: StockHoldingFormValues) => {
    try {
      const payload = {
        assetId: data.assetId,
        stockCode: data.stockCode,
        stockName: data.stockName,
        country: data.country,
        quantity: Number(data.quantity.replace(/,/g, "")),
        avgPrice: Number(data.avgPrice.replace(/,/g, "")),
        currency: data.country === "US" ? ("USD" as const) : ("KRW" as const),
        memo: data.memo || undefined,
      };

      let result;
      if (isEditMode && editingHolding) {
        result = await updateStockHolding(editingHolding.id, payload);
      } else {
        result = await createStockHolding(payload);
      }

      if (result?.success) {
        onOpenChange(false);
        toast.success(
          isEditMode ? "보유내역이 수정되었습니다." : "종목이 추가되었습니다.",
        );
      } else {
        toast.error(
          typeof result?.error === "string"
            ? result.error
            : "저장에 실패했습니다.",
        );
      }
    } catch {
      toast.error("오류가 발생했습니다.");
    }
  };

  const getButtonText = () => {
    if (isSubmitting) return "처리 중...";
    if (!isEditMode) return "추가하기";
    if (isDirty) return "저장하기";
    return "닫기";
  };

  const unitLabel = country === "US" ? "USD" : "원";

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? "보유내역 수정" : "종목 추가"}
      description="보유 종목 정보를 입력하세요"
    >
      <div className="space-y-5 py-4">
        {/* 종목 검색 */}
        <div className="space-y-2">
          <Label>종목 검색 *</Label>
          <StockSearchInput
            value={selectedStock}
            onChange={handleStockSelect}
            error={errors.stockCode?.message}
          />
        </div>

        {/* 수량 */}
        <div className="space-y-2">
          <Label>보유 수량 *</Label>
          <Controller
            name="quantity"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={field.value}
                  onChange={(e) => field.onChange(formatAmount(e.target.value))}
                  placeholder="0"
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

        {/* 평단가 */}
        <div className="space-y-2">
          <Label>평단가 *</Label>
          <Controller
            name="avgPrice"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="0"
                  className="text-right pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {unitLabel}
                </span>
              </div>
            )}
          />
          {errors.avgPrice && (
            <p className="text-xs text-destructive">
              {errors.avgPrice.message}
            </p>
          )}
        </div>

        {/* 메모 */}
        <div className="space-y-2">
          <Label>메모 (선택)</Label>
          <Controller
            name="memo"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="예: 장기 보유" />
            )}
          />
        </div>

        {/* 저장 버튼 */}
        <div className="pt-2">
          <Button
            onClick={handleSubmit(onSubmit)}
            className="w-full"
            size="lg"
            disabled={isSubmitting || (isEditMode && !isDirty)}
          >
            {getButtonText()}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
