"use client";

import { useState, useEffect } from "react";
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
  // TODO : Reat Hook Form 으로 변경
  const [transactionType, setTransactionType] = useState<"INCOME" | "EXPENSE">(
    initialData?.type || "EXPENSE",
  );
  const [amount, setAmount] = useState(initialData?.amount || "");
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "CASH">(
    initialData?.method || "CARD",
  );
  const [categoryId, setCategoryId] = useState<number | null>(
    initialData?.categoryId || null,
  );
  const [memo, setMemo] = useState(initialData?.memo || "");
  const [date, setDate] = useState<Date>(
    initialData?.date || new Date(selectedDate),
  );

  // TODO : 상태 많이 필요한건지 검토
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 카테고리는 props로 받아서 즉시 사용 (API 호출 없음!)
  const categories =
    transactionType === "EXPENSE" ? expenseCategories : incomeCategories;

  useEffect(() => {
    if (mode === "edit" && initialData) {
      const changed =
        transactionType !== initialData.type ||
        amount !== initialData.amount ||
        paymentMethod !== initialData.method ||
        categoryId !== initialData.categoryId ||
        memo !== initialData.memo ||
        dayjs(date).format("YYYY-MM-DD") !==
          dayjs(initialData.date).format("YYYY-MM-DD");
      setHasChanges(changed);
    }
  }, [
    transactionType,
    amount,
    paymentMethod,
    categoryId,
    memo,
    date,
    mode,
    initialData,
  ]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(formatAmount(e.target.value));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const data = {
        type: transactionType,
        amount: parseFloat(amount.replace(/,/g, "")),
        method: paymentMethod,
        date: dayjs(date).format("YYYY-MM-DD"),
        categoryId: categoryId || 1,
        memo,
      };

      console.log("Submit data:", data);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save transaction:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    setIsLoading(true);
    try {
      console.log("Delete transaction:", initialData?.id);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete transaction:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (isLoading) return "처리 중...";
    if (mode === "create") return "등록하기";
    if (hasChanges) return "저장하기";
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
        <Tabs
          value={transactionType}
          onValueChange={(v) => setTransactionType(v as "INCOME" | "EXPENSE")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="EXPENSE">지출</TabsTrigger>
            <TabsTrigger value="INCOME">수입</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-2">
          <Label>날짜</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? dayjs(date).format("YYYY년 M월 D일") : "날짜 선택"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>금액</Label>
          <div className="relative">
            <Input
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0"
              className="text-right text-2xl font-semibold pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              원
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>결제수단</Label>
          <div className="flex gap-2">
            <Badge
              variant={paymentMethod === "CARD" ? "default" : "outline"}
              className="flex-1 justify-center py-2 cursor-pointer"
              onClick={() => setPaymentMethod("CARD")}
            >
              카드
            </Badge>
            <Badge
              variant={paymentMethod === "CASH" ? "default" : "outline"}
              className="flex-1 justify-center py-2 cursor-pointer"
              onClick={() => setPaymentMethod("CASH")}
            >
              현금
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <Label>카테고리</Label>
          {categories.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => setCategoryId(category.id)}
                  className={cn(
                    "text-center p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors",
                    categoryId === category.id &&
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
        </div>

        <div className="space-y-2">
          <Label>메모 (선택)</Label>
          <Input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모를 입력하세요"
          />
        </div>

        <div className="flex gap-2 pt-4">
          {mode === "edit" && (
            <Button
              variant="destructive"
              size="lg"
              onClick={handleDelete}
              disabled={isLoading}
              className="w-auto"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            className="flex-1"
            size="lg"
            disabled={!amount || isLoading || (mode === "edit" && !hasChanges)}
          >
            {getButtonText()}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
