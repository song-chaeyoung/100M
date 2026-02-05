"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmDialog } from "@/components/ui/alert-dialog";
import { cn, formatAmount } from "@/lib/utils";
import { MonthPicker } from "@/components/ui/month-picker";
import { type Category } from "@/lib/api/categories";
import type { FixedExpense } from "@/lib/types/automation";
import {
  fixedExpenseSchema,
  type FixedExpenseInput,
} from "@/lib/validations/fixed-expense";
import {
  createFixedExpense,
  updateFixedExpense,
  deleteFixedExpense,
} from "@/app/actions/fixed-expenses";
import { toast } from "sonner";
import dayjs from "dayjs";

// 기본 기간 (현재 월 ~ 12개월 후)
const getDefaultDates = () => ({
  startDate: dayjs().format("YYYY-MM"),
  endDate: dayjs().add(11, "month").format("YYYY-MM"),
});

interface FixedExpenseFormSheetProps {
  open: boolean;
  onOpenChange: () => void;
  mode: "create" | "edit";
  initialData?: Pick<
    FixedExpense,
    | "id"
    | "title"
    | "amount"
    | "scheduledDay"
    | "type"
    | "categoryId"
    | "method"
    | "startDate"
    | "endDate"
  >;
  categories: Category[];
}

export function FixedExpenseFormSheet({
  open,
  onOpenChange,
  mode,
  initialData,
  categories,
}: FixedExpenseFormSheetProps) {
  const form = useForm<FixedExpenseInput>({
    resolver: zodResolver(fixedExpenseSchema),
    defaultValues: {
      title: "",
      amount: 0,
      scheduledDay: 1,
      type: "FIXED",
      categoryId: undefined,
      method: "CARD",
      ...getDefaultDates(),
    },
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          title: initialData.title,
          amount: Number(initialData.amount),
          scheduledDay: initialData.scheduledDay,
          type: initialData.type,
          categoryId: initialData.categoryId ?? undefined,
          method: initialData.method,
          startDate:
            initialData.startDate?.slice(0, 7) ?? getDefaultDates().startDate,
          endDate:
            initialData.endDate?.slice(0, 7) ?? getDefaultDates().endDate,
        });
      } else {
        form.reset({
          title: "",
          amount: 0,
          scheduledDay: 1,
          type: "FIXED",
          categoryId: undefined,
          method: "CARD",
          ...getDefaultDates(),
        });
      }
    }
  }, [open, initialData, form]);

  const { control, handleSubmit, watch, formState } = form;
  const { isDirty, isSubmitting } = formState;

  // 삭제 확인 다이얼로그
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const amount = watch("amount");
  const categoryId = watch("categoryId");
  const method = watch("method");
  const title = watch("title");

  const isRequiredFieldsFilled =
    !!title && amount > 0 && !!categoryId && !!method;

  const onSubmit = async (data: FixedExpenseInput) => {
    try {
      let result;
      if (mode === "create") {
        result = await createFixedExpense(data);
      } else if (initialData?.id) {
        result = await updateFixedExpense(initialData.id, data);
      }

      if (result?.success) {
        onOpenChange();
        toast.success(
          mode === "create"
            ? "고정 지출이 추가되었습니다."
            : "고정 지출이 수정되었습니다.",
        );
      } else {
        toast.error("저장에 실패했습니다.");
        console.error("Failed to save:", result?.error);
      }
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("오류가 발생했습니다.");
    }
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!initialData?.id) return;

    try {
      const result = await deleteFixedExpense(initialData.id);

      if (result.success) {
        onOpenChange();
        toast.success("고정 지출이 삭제되었습니다.");
      } else {
        toast.error("삭제에 실패했습니다.");
        console.error("Failed to delete:", result.error);
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("오류가 발생했습니다.");
    } finally {
      setDeleteDialogOpen(false);
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
      title={mode === "create" ? "고정 지출 추가" : "고정 지출 수정"}
    >
      <div className="space-y-6 py-4">
        <div className="space-y-2">
          <Label>이름</Label>
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <Input
                value={field.value}
                onChange={field.onChange}
                placeholder="예: 넷플릭스, 월세"
              />
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
                  value={
                    field.value ? formatAmount(field.value.toString()) : ""
                  }
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, "");
                    field.onChange(value ? Number(value) : 0);
                  }}
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
          <Label>매월</Label>
          <Controller
            name="scheduledDay"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={field.value || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === "" ? "" : Number(value));
                  }}
                  className="w-20 text-center"
                />
                <span className="text-muted-foreground">일</span>
              </div>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>기간</Label>
          <div className="flex items-center gap-2">
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <MonthPicker
                  value={field.value}
                  onChange={field.onChange}
                  className="flex-1"
                />
              )}
            />
            <span className="text-muted-foreground">~</span>
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <MonthPicker
                  value={field.value}
                  onChange={field.onChange}
                  className="flex-1"
                />
              )}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            기간 내 매월 자동으로 거래가 생성됩니다
          </p>
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

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="삭제하시겠습니까?"
        description="오늘 이후의 예정된 거래내역은 같이 삭제됩니다."
      />
    </BottomSheet>
  );
}
