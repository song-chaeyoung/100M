/**
 * 주식 관련 포맷 유틸리티
 */

export function formatKRW(amount: number): string {
  return amount.toLocaleString("ko-KR") + "원";
}

export function formatUSD(amount: number): string {
  return (
    "$" +
    amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function formatPrice(amount: number, currency: string): string {
  return currency === "USD" ? formatUSD(amount) : formatKRW(amount);
}
