import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(isSameOrBefore);

/**
 * Tailwind CSS 클래스를 병합하는 유틸리티 함수
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 금액을 한국 원화 형식으로 포맷
 * @param amount 금액
 * @param showSign 부호 표시 여부 (기본: false)
 * @returns 포맷된 금액 문자열 (예: "1,000원", "+1,000원")
 */
export function formatCurrency(
  amount: number,
  showSign: boolean = false,
): string {
  const formatted = new Intl.NumberFormat("ko-KR").format(Math.abs(amount));
  const sign = showSign && amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}${formatted}원`;
}

/**
 * 입력 중에 숫자를 콤마로 포맷
 * @param value 입력값
 * @returns 콤마로 포맷된 문자열
 */
export const formatAmount = (value: string) => {
  const number = value.replace(/[^0-9]/g, "");
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

/**
 * 두 월 사이의 모든 월을 배열로 반환
 * @param startMonth 시작월 (YYYY-MM 형식)
 * @param endMonth 종료월 (YYYY-MM 형식)
 * @returns 월 배열 (예: ["2025-01", "2025-02", ...])
 */
/**
 * 월(YYYY-MM)과 예정일로 유효한 날짜 문자열 생성
 * 해당 월의 마지막 날을 초과하지 않도록 클램핑
 * 예: ("2025-02", 31) → "2025-02-28"
 */
export function toScheduledDate(month: string, day: number): string {
  const lastDay = dayjs(`${month}-01`).daysInMonth();
  const clampedDay = Math.min(day, lastDay);
  return `${month}-${String(clampedDay).padStart(2, "0")}`;
}

export function getMonthsBetween(startMonth: string, endMonth: string): string[] {
  const months: string[] = [];
  let current = dayjs(startMonth).startOf("month");
  const end = dayjs(endMonth).startOf("month");

  while (current.isSameOrBefore(end)) {
    months.push(current.format("YYYY-MM"));
    current = current.add(1, "month");
  }

  return months;
}
