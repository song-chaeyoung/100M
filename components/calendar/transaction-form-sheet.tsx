"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import { Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, formatAmount, formatCurrency } from "@/lib/utils";
import { getCategories, type Category } from "@/lib/api/categories";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/app/actions/transactions";

// Zod 스키마 정의
const transactionFormSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.string().min(1, "금액을 입력하세요"),
  method: z.enum(["CARD", "CASH"]),
  categoryId: z.number().min(1, "카테고리를 선택하세요"),
  memo: z.string().optional(),
  date: z.date(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface TransactionData {
  id?: number;
  type: "INCOME" | "EXPENSE";
  amount: string;
  method: "CARD" | "CASH";
  categoryId: number;
  memo: string;
  date: Date;
}

interface TransactionFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
  mode: "create" | "edit";
  initialData?: TransactionData;
  expenseCategories: Category[];
  incomeCategories: Category[];
}

export function TransactionFormSheet({
  open,
  onOpenChange,
  selectedDate,
  mode,
  initialData,
  expenseCategories,
  incomeCategories,
}: TransactionFormSheetProps) {
  // react-hook-form 설정
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: initialData
      ? {
          type: initialData.type,
          amount: initialData.amount,
          method: initialData.method,
          categoryId: initialData.categoryId,
          memo: initialData.memo || "",
          date: initialData.date,
        }
      : {
          type: "EXPENSE" as const,
          amount: "",
          method: "CARD" as const,
          categoryId: 0,
          memo: "",
          date: new Date(selectedDate),
        },
  });

  const { control, handleSubmit, watch, formState } = form;
  const { isDirty, isSubmitting } = formState;

  // 현재 거래 타입 감시 (카테고리 목록 변경용)
  const transactionType = watch("type");

  // 카테고리는 props로 받아서 즉시 사용
  const categories =
    transactionType === "EXPENSE" ? expenseCategories : incomeCategories;

  // 폼 제출 핸들러
  const onSubmit = async (data: TransactionFormValues) => {
    try {
      const submitData = {
        type: data.type,
        amount: parseFloat(data.amount.replace(/,/g, "")),
        method: data.method,
        date: dayjs(data.date).format("YYYY-MM-DD"),
        categoryId: data.categoryId,
        memo: data.memo || "",
      };

      let result;
      if (mode === "create") {
        result = await createTransaction(submitData);
      } else if (initialData?.id) {
        result = await updateTransaction(initialData.id, submitData);
      }

      if (result?.success) {
        onOpenChange(false);
        // TODO: 성공 토스트 메시지 추가
      } else {
        // TODO: 에러 토스트 메시지 추가
        console.error("Failed to save transaction:", result?.error);
      }
    } catch (error) {
      console.error("Failed to save transaction:", error);
      // TODO: 에러 토스트 메시지 추가
    }
  };

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    if (!initialData?.id) return;

    try {
      const result = await deleteTransaction(initialData.id);

      if (result.success) {
        onOpenChange(false);
        // TODO: 성공 토스트 메시지 추가
      } else {
        // TODO: 에러 토스트 메시지 추가
        console.error("Failed to delete transaction:", result.error);
      }
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      // TODO: 에러 토스트 메시지 추가
    }
  };

  const getButtonText = () => {
    if (isSubmitting) return "처리 중...";
    if (mode === "create") return "등록하기";
    if (isDirty) return "저장하기";
    return "닫기";
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "거래 추가" : "거래 상세"}
      description={dayjs(selectedDate).format("YYYY년 M월 D일")}
      className="min-h-[100svh] max-h-[100svh]"
    >
      <div className="space-y-6 py-4">
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Tabs value={field.value} onValueChange={field.onChange}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="EXPENSE">지출</TabsTrigger>
                <TabsTrigger value="INCOME">수입</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        />

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
                      !field.value && "text-muted-foreground",
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

        <div className="space-y-2">
          <Label>금액</Label>
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <Input
                  type="text"
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

        <div className="space-y-2">
          <Label>결제수단</Label>
          <Controller
            name="method"
            control={control}
            render={({ field }) => (
              <div className="flex gap-2">
                <Badge
                  variant={field.value === "CARD" ? "default" : "outline"}
                  className="flex-1 justify-center py-2 cursor-pointer"
                  onClick={() => field.onChange("CARD")}
                >
                  카드
                </Badge>
                <Badge
                  variant={field.value === "CASH" ? "default" : "outline"}
                  className="flex-1 justify-center py-2 cursor-pointer"
                  onClick={() => field.onChange("CASH")}
                >
                  현금
                </Badge>
              </div>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>카테고리</Label>
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <>
                {categories.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        onClick={() => field.onChange(category.id)}
                        className={cn(
                          "text-center p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors",
                          field.value === category.id &&
                            "bg-primary text-primary-foreground",
                        )}
                      >
                        <div className="text-2xl">{category.icon}</div>
                        <div className="text-xs mt-1">{category.name}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    카테고리가 없습니다
                  </div>
                )}
              </>
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
                placeholder="메모를 입력하세요"
              />
            )}
          />
        </div>

        <div className="flex gap-2 pt-4">
          {mode === "edit" && (
            <Button
              variant="destructive"
              size="lg"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="w-auto"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={handleSubmit(onSubmit)}
            className="flex-1"
            size="lg"
            disabled={
              !formState.isValid ||
              isSubmitting ||
              (mode === "edit" && !isDirty)
            }
          >
            {getButtonText()}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
