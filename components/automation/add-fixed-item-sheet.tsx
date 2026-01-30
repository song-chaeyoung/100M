"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn, formatAmount } from "@/lib/utils";
import { type Category } from "@/lib/api/categories";
import type { Asset } from "@/lib/types/automation";
import { createFixedExpense } from "@/app/actions/fixed-expenses";
import { createFixedSaving } from "@/app/actions/fixed-savings";
import { toast } from "sonner";

interface AddFixedItemSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  assets: Asset[];
}

// 통합 스키마
const addFixedItemSchema = z.object({
  itemType: z.enum(["expense", "saving"]),
  title: z.string().min(1, "이름을 입력하세요"),
  amount: z.number().positive("금액은 0보다 커야 합니다"),
  scheduledDay: z.number().min(1).max(31),
  // 고정 지출용
  type: z.enum(["FIXED", "ETC"]).optional(),
  categoryId: z.number().optional(),
  method: z.enum(["CARD", "CASH"]).optional(),
  // 고정 저축용
  assetId: z.number().optional(),
});

type AddFixedItemInput = z.infer<typeof addFixedItemSchema>;

export function AddFixedItemSheet({
  open,
  onOpenChange,
  categories,
  assets,
}: AddFixedItemSheetProps) {
  const form = useForm<AddFixedItemInput>({
    resolver: zodResolver(addFixedItemSchema),
    defaultValues: {
      itemType: "expense",
      title: "",
      amount: 0,
      scheduledDay: 1,
      type: "FIXED",
      categoryId: undefined,
      method: "CARD",
      assetId: undefined,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        itemType: "expense",
        title: "",
        amount: 0,
        scheduledDay: 1,
        type: "FIXED",
        categoryId: undefined,
        method: "CARD",
        assetId: undefined,
      });
    }
  }, [open, form]);

  const { control, handleSubmit, watch, formState } = form;
  const { isSubmitting } = formState;

  const itemType = watch("itemType");
  const amount = watch("amount");
  const categoryId = watch("categoryId");
  const method = watch("method");
  const assetId = watch("assetId");
  const title = watch("title");

  const isRequiredFieldsFilled = (() => {
    if (!title || amount <= 0) return false;
    if (itemType === "expense") {
      return !!categoryId && !!method;
    } else {
      return !!assetId;
    }
  })();

  const onSubmit = async (data: AddFixedItemInput) => {
    try {
      let result;
      if (data.itemType === "expense") {
        result = await createFixedExpense({
          title: data.title,
          amount: data.amount,
          scheduledDay: data.scheduledDay,
          type: data.type || "FIXED",
          categoryId: data.categoryId!,
          method: data.method || "CARD",
        });
      } else {
        result = await createFixedSaving({
          title: data.title,
          amount: data.amount,
          scheduledDay: data.scheduledDay,
          assetId: data.assetId!,
        });
      }

      if (result?.success) {
        onOpenChange(false);
        toast.success(
          data.itemType === "expense"
            ? "고정 지출이 추가되었습니다."
            : "고정 저축이 추가되었습니다."
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

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="고정 항목 추가"
    >
      <div className="space-y-6 py-4">
        <Controller
          name="itemType"
          control={control}
          render={({ field }) => (
            <Tabs value={field.value} onValueChange={field.onChange}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="expense">고정 지출</TabsTrigger>
                <TabsTrigger value="saving">고정 저축</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        />

        <div className="space-y-2">
          <Label>이름</Label>
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <Input
                value={field.value}
                onChange={field.onChange}
                placeholder={
                  itemType === "expense"
                    ? "예: 넷플릭스, 월세"
                    : "예: 자유적금, 주식 자동매수"
                }
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
                  value={field.value ? formatAmount(field.value.toString()) : ""}
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
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="w-20 text-center"
                />
                <span className="text-muted-foreground">일</span>
              </div>
            )}
          />
        </div>

        {itemType === "expense" && (
          <>
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
                              "bg-primary text-primary-foreground"
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
          </>
        )}

        {itemType === "saving" && (
          <div className="space-y-2">
            <Label>저축 계좌</Label>
            {assets.length > 0 ? (
              <Controller
                name="assetId"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2">
                    {assets.map((asset) => (
                      <div
                        key={asset.id}
                        onClick={() => field.onChange(asset.id)}
                        className={cn(
                          "p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors",
                          field.value === asset.id &&
                            "bg-primary text-primary-foreground"
                        )}
                      >
                        <div className="font-medium">{asset.name}</div>
                        <div className="text-xs opacity-70">{asset.type}</div>
                      </div>
                    ))}
                  </div>
                )}
              />
            ) : (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-muted text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">먼저 자산 계좌를 추가해주세요</span>
              </div>
            )}
          </div>
        )}

        <div className="pt-4">
          <Button
            onClick={handleSubmit(onSubmit)}
            className="w-full"
            size="lg"
            disabled={!isRequiredFieldsFilled || isSubmitting}
          >
            {isSubmitting ? "처리 중..." : "등록하기"}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
