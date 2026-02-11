"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatAmount } from "@/lib/utils";
import { createAsset, updateAsset } from "@/app/actions/assets";
import { toast } from "sonner";
import {
  Asset,
  assetFormSchema,
  AssetFormValues,
} from "@/lib/validations/asset";
import { ASSET_TYPE_OPTIONS } from "@/lib/const";

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

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: "",
      type: "SAVINGS",
      balance: "0",
      institution: "",
      accountNumber: "",
      interestRate: "",
    },
  });

  const { control, handleSubmit, formState, reset } = form;
  const { isDirty, isSubmitting } = formState;

  useEffect(() => {
    if (open) {
      if (editingAsset) {
        reset({
          name: editingAsset.name,
          type: editingAsset.type as AssetFormValues["type"],
          balance: formatAmount(Number(editingAsset.balance).toFixed(0)),
          institution: editingAsset.institution || "",
          accountNumber: editingAsset.accountNumber || "",
          interestRate: editingAsset.interestRate || "",
        });
      } else {
        reset({
          name: "",
          type: "SAVINGS",
          balance: "0",
          institution: "",
          accountNumber: "",
          interestRate: "",
        });
      }
    }
  }, [open, editingAsset, reset]);

  const onSubmit = async (data: AssetFormValues) => {
    try {
      const submitData = {
        name: data.name,
        type: data.type,
        balance: Number(data.balance.replace(/,/g, "")) || 0,
        institution: data.institution || undefined,
        accountNumber: data.accountNumber || undefined,
        interestRate: data.interestRate
          ? Number(data.interestRate) || 0
          : undefined,
        isActive: true,
      };

      let result;
      if (isEditMode && editingAsset) {
        result = await updateAsset(editingAsset.id, submitData);
      } else {
        result = await createAsset(submitData);
      }

      if (result?.success) {
        onOpenChange(false);
        toast.success(
          isEditMode ? "자산이 수정되었습니다." : "자산이 추가되었습니다.",
        );
      } else {
        toast.error(
          typeof result?.error === "string"
            ? result.error
            : "저장에 실패했습니다.",
        );
      }
    } catch (error) {
      console.error("Failed to save asset:", error);
      toast.error("오류가 발생했습니다.");
    }
  };

  const getButtonText = () => {
    if (isSubmitting) return "처리 중...";
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
        {/* 자산 이름 */}
        <div className="space-y-2">
          <Label>자산 이름 *</Label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="예: 신한은행 적금" />
            )}
          />
        </div>

        {/* 자산 유형 */}
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
                    onClick={() => field.onChange(option.value)}
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
        </div>

        {/* 초기 잔액 */}
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
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  원
                </span>
              </div>
            )}
          />
        </div>

        {/* 금융기관 */}
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

        {/* 계좌번호 */}
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

        {/* 이율 */}
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

        {/* 저장 버튼 */}
        <div className="pt-4">
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
