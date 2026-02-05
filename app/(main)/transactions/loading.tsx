import dayjs from "dayjs";
import { PageHeader } from "@/components/page-header";
import { generateCalendarDays } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function Loading() {
  const currentMonth = dayjs().format("YYYY-MM");
  const days = generateCalendarDays(currentMonth);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader />

      <div className="space-y-2">
        {/* 월 제목 */}
        <h2 className="text-lg font-semibold">
          {dayjs(currentMonth).format("YYYY년 M월")}
        </h2>

        {/* 달력 */}
        <div className="space-y-2">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day, index) => (
              <div
                key={day}
                className={cn(
                  "text-center text-sm font-semibold py-2",
                  index === 0 && "text-red-500",
                  index === 6 && "text-blue-500",
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 달력 그리드 */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => (
              <div
                key={day.date}
                className={cn(
                  "aspect-square p-2 flex flex-col items-center justify-center rounded-lg",
                  !day.isCurrentMonth && "text-muted-foreground opacity-50",
                  day.isToday && "bg-primary/10 text-primary",
                )}
              >
                <span className="text-sm font-medium">
                  {dayjs(day.date).date()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
