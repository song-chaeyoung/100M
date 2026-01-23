"use client";

import { generateCalendarDays } from "@/lib/calendar-utils";
import type { TransactionSummary } from "@/lib/api/types";
import { DayCell } from "./day-cell";

interface CalendarGridProps {
  currentMonth: string;
  transactions: TransactionSummary[];
  selectedDate: string | null;
  onDateClick: (date: string) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function CalendarGrid({
  currentMonth,
  transactions,
  selectedDate,
  onDateClick,
}: CalendarGridProps) {
  const days = generateCalendarDays(currentMonth);

  const transactionMap = new Map(transactions.map((t) => [t.date, t]));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day, index) => (
          <div
            key={day}
            className={`text-center text-sm font-semibold py-2 ${
              index === 0 ? "text-red-500" : index === 6 ? "text-blue-500" : ""
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const transaction = transactionMap.get(day.date);
          return (
            <DayCell
              key={day.date}
              date={day.date}
              isCurrentMonth={day.isCurrentMonth}
              isToday={day.isToday}
              isSelected={day.date === selectedDate}
              hasIncome={transaction?.hasIncome}
              hasExpense={transaction?.hasExpense}
              onClick={() => onDateClick(day.date)}
            />
          );
        })}
      </div>
    </div>
  );
}
