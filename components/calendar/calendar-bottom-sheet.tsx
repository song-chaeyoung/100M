"use client";

import dayjs from "dayjs";
import { BottomSheet } from "@/components/bottom-sheet";

interface CalendarBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string | null;
}

export function CalendarBottomSheet({
  open,
  onOpenChange,
  selectedDate,
}: CalendarBottomSheetProps) {
  if (!selectedDate) return null;

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={dayjs(selectedDate).format("YYYY년 M월 D일")}
      description="거래 내역"
    >
      <div className="py-4">
        <p className="text-center text-muted-foreground">
          {dayjs(selectedDate).format("YYYY-MM-DD")}의 거래 내역
        </p>
        <p className="text-center text-sm text-muted-foreground mt-2">
          거래 내역이 없습니다.
        </p>
      </div>
    </BottomSheet>
  );
}
