import dayjs from "dayjs";

export interface CalendarDay {
  date: string; // "2026-01-15"
  isCurrentMonth: boolean;
  isToday: boolean;
}

/**
 * 캘린더에 표시할 날짜 배열 생성 (이전/다음 달 포함)
 * @param yearMonth - "YYYY-MM" 형식의 월
 * @returns 캘린더에 표시할 날짜 배열 (보통 35~42개)
 */
export function generateCalendarDays(yearMonth: string): CalendarDay[] {
  const firstDay = dayjs(yearMonth).startOf("month");
  const lastDay = dayjs(yearMonth).endOf("month");

  // 일요일부터 시작하도록 설정
  const startDate = firstDay.startOf("week");
  const endDate = lastDay.endOf("week");

  const days: CalendarDay[] = [];
  let current = startDate;

  while (current.isBefore(endDate) || current.isSame(endDate, "day")) {
    days.push({
      date: current.format("YYYY-MM-DD"),
      isCurrentMonth: current.month() === firstDay.month(),
      isToday: current.isSame(dayjs(), "day"),
    });
    current = current.add(1, "day");
  }

  return days;
}
