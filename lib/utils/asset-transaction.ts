import type { AssetTransactionType } from "@/db/schema";

/**
 * 거래 타입에 따른 잔액 연산 방향 결정
 */
export function getBalanceOperation(
  type: AssetTransactionType,
): "add" | "subtract" {
  return type === "DEPOSIT" || type === "PROFIT" ? "add" : "subtract";
}
