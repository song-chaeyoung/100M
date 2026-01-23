"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { Plus } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/ui/button";
import { TransactionFormSheet } from "./transaction-form-sheet";
import type { Category } from "@/lib/api/categories";

interface CalendarBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string | null;
  expenseCategories: Category[];
  incomeCategories: Category[];
}

export function CalendarBottomSheet({
  open,
  onOpenChange,
  selectedDate,
  expenseCategories,
  incomeCategories,
}: CalendarBottomSheetProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  if (!selectedDate) return null;

  const handleAddTransaction = () => {
    setIsFormOpen(true);
  };

  return (
    <>
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={dayjs(selectedDate).format("YYYY년 M월 D일")}
        description="거래 내역"
      >
        <div className="space-y-4">
          {/* 거래 내역 리스트 영역 */}
          <div className="min-h-[200px]">
            <p className="text-center text-muted-foreground py-8">
              거래 내역이 없습니다.
            </p>
          </div>

          {/* 추가 버튼 */}
          <Button onClick={handleAddTransaction} className="w-full" size="lg">
            <Plus className="mr-2 h-5 w-5" />
            거래 추가
          </Button>
        </div>
      </BottomSheet>

      <TransactionFormSheet
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        selectedDate={selectedDate}
        mode="create"
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
      />
    </>
  );
}
