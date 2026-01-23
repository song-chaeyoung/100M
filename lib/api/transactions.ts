import { getTransactionsByMonth as getTransactionsByMonthAction } from "@/app/actions/transactions";
import type { TransactionSummary } from "./types";

export async function getTransactionsByMonth(
  month: string,
): Promise<TransactionSummary[]> {
  return getTransactionsByMonthAction(month);
}
