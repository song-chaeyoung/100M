"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatAmount } from "@/lib/utils";
import { createAsset, deleteAsset, updateAsset } from "@/app/actions/assets";
import { toast } from "sonner";
import {
  Asset,
  assetFormSchema,
  type AssetFormValues,
} from "@/lib/validations/asset";
import { ASSET_TYPE_OPTIONS } from "@/lib/const";
import { StockHoldingInputList } from "@/components/assets/stock-holding-input-list";

interface AssetFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAsset?: Asset | null;
}

export function AssetFormSheet({
  open,
  onOpenChange,
  editingAsset,
}: AssetFormSheetProps) {
  const isEditMode = !!editingAsset;
  const [step, setStep] = useState<1 | 2>(1);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: "",
      type: "SAVINGS",
      balance: "0",
      institution: "",
      accountNumber: "",
      interestRate: "",
      stocks: [],
      recordAsSaving: false,
    },
  });

  const { control, handleSubmit, formState, reset, setValue, watch, trigger } =
    form;
  const { isDirty, isSubmitting, errors } = formState;

  const currentType = watch("type");
  const stocks = watch("stocks") || [];

  useEffect(() => {
    if (!open) return;

    setStep(1);
    if (editingAsset) {
      reset({
        name: editingAsset.name,
        type: editingAsset.type as AssetFormValues["type"],
        balance: formatAmount(Number(editingAsset.balance).toFixed(0)),
        institution: editingAsset.institution || "",
        accountNumber: editingAsset.accountNumber || "",
        interestRate: editingAsset.interestRate || "",
        stocks: [],
        recordAsSaving: false,
      });
      return;
    }

    reset({
      name: "",
      type: "SAVINGS",
      balance: "0",
      institution: "",
      accountNumber: "",
      interestRate: "",
      stocks: [],
      recordAsSaving: false,
    });
  }, [open, editingAsset, reset]);

  const handleNextStep = async () => {
    const isStep1Valid = await trigger([
      "name",
      "type",
      "balance",
      "institution",
      "accountNumber",
      "interestRate",
    ]);

    if (isStep1Valid) {
      setStep(2);
    }
  };

  const onSubmit = async (data: AssetFormValues) => {
    try {
      let initialBalance = Number(data.balance.replace(/,/g, "")) || 0;
      const hasStockInfo =
        data.type === "STOCK" && data.stocks && data.stocks.length > 0;

      // STOCK/GOLD는 생성 시 직접 잔액 입력을 받지 않고 별도 로직으로 계산합니다.
      if ((data.type === "STOCK" || data.type === "GOLD") && !isEditMode) {
        initialBalance = 0;
      }

      const submitData = {
        name: data.name,
        type: data.type,
        balance: initialBalance,
        institution: data.institution || undefined,
        accountNumber: data.accountNumber || undefined,
        interestRate: data.interestRate
          ? Number(data.interestRate) || 0
          : undefined,
        isActive: true,
      };

      const result =
        isEditMode && editingAsset
          ? await updateAsset(editingAsset.id, submitData)
          : await createAsset(submitData);

      if (result?.success) {
        if (!isEditMode && hasStockInfo && result.data?.id) {
          const { createStockHolding } = await import("@/app/actions/stocks");
          const parseFormattedNumber = (val: string) =>
            Number(val.replace(/,/g, ""));

          const failedStocks: string[] = [];

          for (const stock of data.stocks!) {
            if (stock.stockCode && stock.quantity && stock.avgPrice) {
              const stockResult = await createStockHolding({
                assetId: result.data.id,
                stockCode: stock.stockCode,
                stockName: stock.stockName!,
                country: stock.country as "KR" | "US",
                market: stock.market as
                  | "KOSPI"
                  | "KOSDAQ"
                  | "NYSE"
                  | "NASDAQ"
                  | "AMEX",
                quantity: parseFormattedNumber(stock.quantity),
                avgPrice: parseFormattedNumber(stock.avgPrice),
                currency: stock.country === "US" ? "USD" : "KRW",
                memo: "초기 자산 등록",
                recordAsSaving: false,
              });

              if (!stockResult?.success) {
                failedStocks.push(stock.stockName || stock.stockCode);
              }
            }
          }

          if (failedStocks.length > 0) {
            await deleteAsset(result.data.id);
            toast.error(
              `일부 종목(${failedStocks.join(", ")}) 등록에 실패하여 자산 생성을 취소했습니다.`,
            );
            return;
          }
        }

        onOpenChange(false);
        if (!isEditMode && data.type === "GOLD") {
          toast.success(
            "금 자산을 생성했습니다. 보유 수량은 상세 화면의 매수/매도에서 등록해주세요.",
          );
        } else {
          toast.success(isEditMode ? "자산을 수정했습니다." : "자산을 추가했습니다.");
        }
        return;
      }

      toast.error(
        typeof result?.error === "string"
          ? result.error
          : "저장에 실패했습니다.",
      );
    } catch (error) {
      console.error("Failed to save asset:", error);
      toast.error("오류가 발생했습니다.");
    }
  };

  const getButtonText = () => {
    if (isSubmitting) return "처리 중...";
    if (!isEditMode && step === 1 && currentType === "STOCK") {
      return "다음 (보유 종목 입력)";
    }
    if (!isEditMode) return "추가하기";
    if (isDirty) return "저장하기";
    return "닫기";
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? "자산 수정" : "자산 추가"}
      description="자산 계좌 정보를 입력하세요"
    >
      <div className="space-y-6 py-4">
        {step === 1 && (
          <>
            <div className="space-y-2">
              <Label>자산 이름 *</Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="예: 신한은행 입출금" />
                )}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>자산 유형 *</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-4 gap-2">
                    {ASSET_TYPE_OPTIONS.map((option) => (
                      <div
                        key={option.value}
                        onClick={() => {
                          field.onChange(option.value);
                          if (
                            (option.value === "STOCK" ||
                              option.value === "GOLD") &&
                            !isEditMode
                          ) {
                            setValue("balance", "0", { shouldDirty: true });
                          }
                        }}
                        className={cn(
                          "text-center p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors",
                          field.value === option.value &&
                            "bg-primary text-primary-foreground",
                        )}
                      >
                        <div className="text-xl">{option.icon}</div>
                        <div className="text-xs mt-1">{option.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              />
              {errors.type && (
                <p className="text-xs text-destructive">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>초기 잔액</Label>
              <Controller
                name="balance"
                control={control}
                render={({ field }) => (
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={field.value}
                      onChange={(e) => field.onChange(formatAmount(e.target.value))}
                      placeholder="0"
                      className="text-right pr-8"
                      disabled={
                        (currentType === "STOCK" && !isEditMode) ||
                        currentType === "GOLD"
                      }
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      원
                    </span>
                  </div>
                )}
              />
              {currentType === "STOCK" && !isEditMode && (
                <p className="text-xs text-muted-foreground">
                  주식 자산은 다음 단계에서 보유 종목을 등록하면 잔액이 자동 계산됩니다.
                </p>
              )}
              {currentType === "GOLD" && (
                <p className="text-xs text-muted-foreground">
                  금 자산 잔액은 매수/매도 거래 기준으로 자동 계산됩니다.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>금융기관 (선택)</Label>
              <Controller
                name="institution"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="예: 신한은행" />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>계좌번호 (선택)</Label>
              <Controller
                name="accountNumber"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="예: 110-xxx-xxxxxx" />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>이율 (선택)</Label>
              <Controller
                name="interestRate"
                control={control}
                render={({ field }) => (
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      {...field}
                      placeholder="0.0"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  </div>
                )}
              />
            </div>
          </>
        )}

        {step === 2 && (
          <div className="space-y-5">
            {currentType === "STOCK" && (
              <>
                <div className="text-sm text-muted-foreground mb-4">
                  [선택] 현재 보유 중인 종목이 있다면 등록해주세요. <br />
                  (건너뛰기를 누르면 잔액이 0원인 빈 계좌가 생성됩니다)
                </div>

                <StockHoldingInputList
                  control={control}
                  watch={watch}
                  setValue={setValue}
                />
              </>
            )}

            {currentType !== "STOCK" && (
              <div className="text-sm text-muted-foreground">
                추가 입력 항목이 없습니다.
              </div>
            )}
          </div>
        )}

        <div className="pt-4 flex gap-2">
          {step === 2 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="flex-shrink-0"
              disabled={isSubmitting}
            >
              이전
            </Button>
          )}

          {step === 1 && currentType === "STOCK" && !isEditMode ? (
            <Button type="button" onClick={handleNextStep} className="w-full" size="lg">
              {getButtonText()}
            </Button>
          ) : step === 2 && currentType === "STOCK" ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSubmit((data) => onSubmit({ ...data, stocks: [] }))}
                className="flex-1"
                size="lg"
                disabled={isSubmitting}
              >
                건너뛰기
              </Button>
              <Button
                onClick={handleSubmit(onSubmit)}
                className="flex-1"
                size="lg"
                disabled={
                  isSubmitting ||
                  stocks.some((s) => !s.stockCode || !s.quantity || !s.avgPrice)
                }
              >
                {getButtonText()}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSubmit(onSubmit)}
              className="w-full"
              size="lg"
              disabled={isSubmitting || (isEditMode && !isDirty)}
            >
              {getButtonText()}
            </Button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
