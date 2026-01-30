"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type MonthCalendarProps = {
  value?: string | Date; // YYYY-MM or Date object
  onChange?: (value: string) => void;
  className?: string;
  yearRange?: number; // How many years back/forward to allow? (optional logic)
};

export function MonthCalendar({
  value,
  onChange,
  className,
}: MonthCalendarProps) {
  // Initialize view year from value or current date
  const [year, setYear] = React.useState<number>(() => {
    if (value) return dayjs(value).year();
    return dayjs().year();
  });

  // Sync view year if value changes externally (optional, but good UX)
  React.useEffect(() => {
    if (value) {
      setYear(dayjs(value).year());
    }
  }, [value]);

  const handleYearChange = (delta: number) => {
    setYear((prev) => prev + delta);
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newValue = dayjs()
      .year(year)
      .month(monthIndex)
      .startOf("month")
      .format("YYYY-MM");

    onChange?.(newValue);
  };

  const currentMonthValue = value ? dayjs(value).month() : null;
  const currentYearValue = value ? dayjs(value).year() : null;

  return (
    <div className={cn("p-3", className)}>
      <div className="flex items-center justify-between mb-4 space-x-2">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          onClick={() => handleYearChange(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">{year}년</div>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          onClick={() => handleYearChange(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Button
            key={i}
            variant={
              currentYearValue === year && currentMonthValue === i
                ? "default"
                : "ghost"
            }
            className={cn(
              "h-9 w-full font-normal aria-selected:opacity-100",
              // Optional: mimicking calendar day styles
            )}
            onClick={() => handleMonthSelect(i)}
          >
            {i + 1}월
          </Button>
        ))}
      </div>
    </div>
  );
}
