"use client";

import dayjs from "dayjs";
import { cn } from "@/lib/utils";

interface DayCellProps {
  date: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasIncome?: boolean;
  hasExpense?: boolean;
  onClick: () => void;
}

export function DayCell({
  date,
  isCurrentMonth,
  isToday,
  isSelected,
  hasIncome,
  hasExpense,
  onClick,
}: DayCellProps) {
  const dayNumber = dayjs(date).date();

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative aspect-square p-2 flex flex-col items-center justify-center transition-colors",
        "hover:bg-accent rounded-lg",
        !isCurrentMonth && "text-muted-foreground opacity-50",
        isToday && !isSelected && "bg-primary/10 text-primary",
        isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
      )}
    >
      <span className="text-sm font-medium">{dayNumber}</span>

      {(hasIncome || hasExpense) && (
        <div className="flex gap-1 mt-1">
          {hasIncome && (
            <div
              className="w-1.5 h-1.5 rounded-full bg-blue-500"
              title="수입 있음"
            />
          )}
          {hasExpense && (
            <div
              className="w-1.5 h-1.5 rounded-full bg-red-500"
              title="지출 있음"
            />
          )}
        </div>
      )}
    </button>
  );
}
