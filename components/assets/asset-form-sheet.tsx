"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatAmount } from "@/lib/utils";
import { createAsset, updateAsset } from "@/app/actions/assets";
import { toast } from "sonner";
import { Asset } from "@/lib/validations/asset";

const assetFormSchema = z.object({
  name: z.string().min(1, "자산 이름을 입력하세요"),
  type: z.enum(
    ["SAVINGS", "DEPOSIT", "STOCK", "FUND", "CRYPTO", "REAL_ESTATE", "OTHER"],
    { message: "자산 유형을 선택하세요" },
  ),
  balance: z.string(),
  institution: z.string().optional(),
  accountNumber: z.string().optional(),
  interestRate: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

const ASSET_TYPE_OPTIONS = [
  { value: "SAVINGS", label: "예금", icon: "🏦" },
  { value: "DEPOSIT", label: "적금", icon: "💰" },
  { value: "STOCK", label: "주식", icon: "📈" },
  { value: "FUND", label: "펀드", icon: "📊" },
  { value: "CRYPTO", label: "암호화폐", icon: "🪙" },
  { value: "REAL_ESTATE", label: "부동산", icon: "🏠" },
  { value: "OTHER", label: "기타", icon: "💼" },
];

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

  useEffect(() => {
    if (open) {
      if (editingAsset) {
        form.reset({
          name: editingAsset.name,
          type: editingAsset.type as AssetFormValues["type"],
          balance: formatAmount(Number(editingAsset.balance).toFixed(0)),
          institution: editingAsset.institution || "",
          accountNumber: editingAsset.accountNumber || "",
          interestRate: editingAsset.interestRate || "",
        });
      } else {
        form.reset({
          name: "",
          type: "SAVINGS",
          balance: "0",
          institution: "",
          accountNumber: "",
          interestRate: "",
        });
      }
    }
  }, [open, editingAsset, form]);

  const { control, handleSubmit, formState } = form;
  const { isDirty, isSubmitting } = formState;

  const onSubmit = async (data: AssetFormValues) => {
    try {
      const submitData = {
        name: data.name,
        type: data.type,
        balance: parseFloat(data.balance.replace(/,/g, "") || "0"),
        institution: data.institution || undefined,
        accountNumber: data.accountNumber || undefined,
        interestRate: data.interestRate
          ? parseFloat(data.interestRate)
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
      className="min-h-[80svh] max-h-svh"
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
