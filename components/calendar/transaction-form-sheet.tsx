"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, formatAmount } from "@/lib/utils";
import { type Category } from "@/lib/api/categories";
import {
  transactionFormSchema,
  type TransactionFormValues,
  type TransactionData,
} from "@/lib/validations/transaction";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/app/actions/transactions";
import { toast } from "sonner";

interface TransactionFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
  mode: "create" | "edit";
  initialData?: TransactionData;
  expenseCategories: Category[];
  incomeCategories: Category[];
  savingCategories: Category[];
}

export function TransactionFormSheet({
  open,
  onOpenChange,
  selectedDate,
  mode,
  initialData,
  expenseCategories,
  incomeCategories,
  savingCategories,
}: TransactionFormSheetProps) {
  // react-hook-form 설정
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: "EXPENSE",
      amount: "",
      method: "CARD",
      categoryId: undefined,
      memo: "",
      date: new Date(selectedDate),
      isConfirmed: true,
    },
  });

  console.log(initialData);

  // 폼 데이터 동기화
  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          type: initialData.type,
          amount: formatAmount(Number(initialData.amount).toFixed(0)),
          method: initialData.method ?? undefined,
          categoryId: initialData.categoryId ?? undefined,
          memo: initialData.memo || "",
          date: initialData.date,
          isConfirmed: initialData.isConfirmed,
        });
      } else {
        form.reset({
          type: "EXPENSE",
          amount: "",
          method: "CARD",
          categoryId: undefined,
          memo: "",
          date: new Date(selectedDate),
          isConfirmed: true,
        });
      }
    }
  }, [open, initialData, selectedDate, form]);

  const { control, handleSubmit, watch, formState } = form;
  const { isDirty, isSubmitting } = formState;

  // 현재 거래 타입 감시 (카테고리 목록 변경용)
  const transactionType = watch("type");
  const categoryId = watch("categoryId");
  const method = watch("method");
  const amount = watch("amount");

  // 타입별 필수값 검증
  const isRequiredFieldsFilled = (() => {
    // 공통: 금액 필수
    if (!amount) return false;

    // INCOME/EXPENSE: categoryId, method 필수
    if (transactionType === "INCOME" || transactionType === "EXPENSE") {
      return !!categoryId && !!method;
    }

    // SAVING: categoryId, method 불필요
    return true;
  })();

  // 카테고리는 props로 받아서 즉시 사용
  const categories = (() => {
    switch (transactionType) {
      case "EXPENSE":
        return expenseCategories;
      case "INCOME":
        return incomeCategories;
      case "SAVING":
        return savingCategories;
      default:
        return [];
    }
  })();

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
        isConfirmed: data.isConfirmed,
      };

      let result;
      if (mode === "create") {
        result = await createTransaction(submitData);
      } else if (initialData?.id) {
        result = await updateTransaction(initialData.id, submitData);
      }

      if (result?.success) {
        onOpenChange(false);
        toast.success(
          mode === "create"
            ? "거래 내역이 추가되었습니다."
            : "거래 내역이 수정되었습니다.",
        );
      } else {
        toast.error("저장에 실패했습니다.");
        console.error("Failed to save transaction:", result?.error);
      }
    } catch (error) {
      console.error("Failed to save transaction:", error);
      toast.error("오류가 발생했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    if (!initialData?.id) return;

    try {
      const result = await deleteTransaction(initialData.id);

      if (result.success) {
        onOpenChange(false);
        toast.success("거래 내역이 삭제되었습니다.");
      } else {
        toast.error("삭제에 실패했습니다.");
        console.error("Failed to delete transaction:", result.error);
      }
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      toast.error("오류가 발생했습니다.");
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="EXPENSE">지출</TabsTrigger>
                <TabsTrigger value="INCOME">수입</TabsTrigger>
                <TabsTrigger value="SAVING">저축</TabsTrigger>
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

        {transactionType !== "SAVING" && (
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
        )}

        {categories.length > 0 && (
          <div className="space-y-2">
            <Label>카테고리</Label>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
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
              )}
            />
          </div>
        )}

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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="isConfirmed">실제 발생한 거래</Label>
            <Controller
              name="isConfirmed"
              control={control}
              render={({ field }) => (
                <Switch
                  id="isConfirmed"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            꺼두면 목표 금액 계산에 포함되지 않습니다
          </p>
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
              !isRequiredFieldsFilled ||
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
