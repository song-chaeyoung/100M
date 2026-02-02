"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import { Calendar as CalendarIcon } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatAmount } from "@/lib/utils";
import {
  createAssetTransaction,
  updateAssetTransaction,
} from "@/app/actions/asset-transactions";
import { toast } from "sonner";
import type { AssetTransactionType } from "@/db/schema";

// 폼 스키마
const assetTransactionFormSchema = z
  .object({
    type: z.enum(["DEPOSIT", "WITHDRAW", "PROFIT", "LOSS", "TRANSFER"]),
    amount: z.string().min(1, "금액을 입력하세요"),
    date: z.date(),
    memo: z.string().optional(),
    toAssetId: z.number().optional(),
  })
  .refine(
    (data) =>
      data.type !== "TRANSFER" || data.toAssetId !== undefined,
    {
      message: "이체 대상 자산을 선택하세요",
      path: ["toAssetId"],
    }
  );

type AssetTransactionFormValues = z.infer<typeof assetTransactionFormSchema>;

const TYPE_OPTIONS: { value: AssetTransactionType; label: string }[] = [
  { value: "DEPOSIT", label: "입금" },
  { value: "WITHDRAW", label: "출금" },
  { value: "PROFIT", label: "수익" },
  { value: "LOSS", label: "손실" },
  { value: "TRANSFER", label: "이체" },
];

interface Asset {
  id: number;
  name: string;
  type: string;
  balance: string;
  institution: string | null;
  accountNumber: string | null;
  interestRate: string | null;
  icon: string | null;
  color: string | null;
  isActive: boolean;
}

interface AssetTransaction {
  id: number;
  assetId: number;
  type: AssetTransactionType;
  amount: string;
  date: string;
  memo: string | null;
  isFixed: boolean;
  fixedSavingId: number | null;
  toAssetId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AssetTransactionFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: number;
  allAssets: Asset[];
  editingTransaction?: AssetTransaction | null;
}

export function AssetTransactionFormSheet({
  open,
  onOpenChange,
  assetId,
  allAssets,
  editingTransaction,
}: AssetTransactionFormSheetProps) {
  const isEditMode = !!editingTransaction;

  const form = useForm<AssetTransactionFormValues>({
    resolver: zodResolver(assetTransactionFormSchema),
    defaultValues: {
      type: "DEPOSIT",
      amount: "",
      date: new Date(),
      memo: "",
      toAssetId: undefined,
    },
  });

  // 폼 데이터 동기화
  useEffect(() => {
    if (open) {
      if (editingTransaction) {
        form.reset({
          type: editingTransaction.type,
          amount: formatAmount(Number(editingTransaction.amount).toFixed(0)),
          date: new Date(editingTransaction.date),
          memo: editingTransaction.memo || "",
          toAssetId: editingTransaction.toAssetId || undefined,
        });
      } else {
        form.reset({
          type: "DEPOSIT",
          amount: "",
          date: new Date(),
          memo: "",
          toAssetId: undefined,
        });
      }
    }
  }, [open, editingTransaction, form]);

  const { control, handleSubmit, watch, formState } = form;
  const { isDirty, isSubmitting } = formState;

  const transactionType = watch("type");
  const amount = watch("amount");

  // 이체 가능한 다른 자산 목록
  const transferableAssets = allAssets.filter(
    (a) => a.id !== assetId && a.isActive
  );

  // 폼 제출 핸들러
  const onSubmit = async (data: AssetTransactionFormValues) => {
    try {
      const submitData = {
        assetId,
        type: data.type,
        amount: parseFloat(data.amount.replace(/,/g, "")),
        date: dayjs(data.date).format("YYYY-MM-DD"),
        memo: data.memo || "",
        toAssetId: data.type === "TRANSFER" ? data.toAssetId : undefined,
      };

      let result;
      if (isEditMode && editingTransaction) {
        result = await updateAssetTransaction(editingTransaction.id, submitData);
      } else {
        result = await createAssetTransaction(submitData);
      }

      if (result?.success) {
        onOpenChange(false);
        toast.success(
          isEditMode
            ? "거래가 수정되었습니다."
            : "거래가 추가되었습니다."
        );
      } else {
        toast.error(
          typeof result?.error === "string"
            ? result.error
            : "저장에 실패했습니다."
        );
      }
    } catch (error) {
      console.error("Failed to save asset transaction:", error);
      toast.error("오류가 발생했습니다.");
    }
  };

  const getButtonText = () => {
    if (isSubmitting) return "처리 중...";
    if (!isEditMode) return "등록하기";
    if (isDirty) return "저장하기";
    return "닫기";
  };

  const isValidForm =
    amount &&
    (transactionType !== "TRANSFER" ||
      (transactionType === "TRANSFER" && watch("toAssetId")));

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? "거래 수정" : "거래 추가"}
      description="입출금 내역을 기록합니다"
      className="min-h-[80svh] max-h-[100svh]"
    >
      <div className="space-y-6 py-4">
        {/* 거래 타입 선택 */}
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Tabs value={field.value} onValueChange={field.onChange}>
              <TabsList className="grid w-full grid-cols-5">
                {TYPE_OPTIONS.map((option) => (
                  <TabsTrigger key={option.value} value={option.value}>
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        />

        {/* 날짜 선택 */}
        <div className="space-y-2">
          <Label>날짜</Label>
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value
                      ? dayjs(field.value).format("YYYY년 M월 D일")
                      : "날짜 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                  />
                </PopoverContent>
              </Popover>
            )}
          />
        </div>

        {/* 금액 입력 */}
        <div className="space-y-2">
          <Label>금액</Label>
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={field.value}
                  onChange={(e) => field.onChange(formatAmount(e.target.value))}
                  placeholder="0"
                  className="text-right text-2xl font-semibold pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  원
                </span>
              </div>
            )}
          />
        </div>

        {/* 이체 대상 자산 선택 (TRANSFER일 때만) */}
        {transactionType === "TRANSFER" && (
          <div className="space-y-2">
            <Label>이체 대상 자산</Label>
            <Controller
              name="toAssetId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value?.toString()}
                  onValueChange={(value) => field.onChange(parseInt(value, 10))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="자산을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {transferableAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id.toString()}>
                        {asset.icon || "💰"} {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}

        {/* 메모 입력 */}
        <div className="space-y-2">
          <Label>메모 (선택)</Label>
          <Controller
            name="memo"
            control={control}
            render={({ field }) => (
              <Input
                value={field.value || ""}
                onChange={field.onChange}
                placeholder="메모를 입력하세요"
              />
            )}
          />
        </div>

        {/* 저장 버튼 */}
        <div className="pt-4">
          <Button
            onClick={handleSubmit(onSubmit)}
            className="w-full"
            size="lg"
            disabled={
              !isValidForm ||
              isSubmitting ||
              (isEditMode && !isDirty)
            }
          >
            {getButtonText()}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
