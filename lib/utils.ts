import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
