"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import dayjs from "dayjs";
import type { TransactionSummary } from "@/lib/api/types";

/**
 * 특정 월의 거래 내역 요약 조회 (Server Action)
 * @param month - "YYYY-MM" 형식의 월
 * @returns 날짜별 수입/지출 여부 배열
 */
export async function getTransactionsByMonth(
  month: string,
): Promise<TransactionSummary[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    // 해당 월의 시작일과 종료일
    const startDate = dayjs(month).startOf("month").format("YYYY-MM-DD");
    const endDate = dayjs(month).endOf("month").format("YYYY-MM-DD");

    // 거래 내역 조회
    const result = await db
      .select({
        date: transactions.date,
        type: transactions.type,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, session.user.id),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
        ),
      );

    // 날짜별로 수입/지출 여부 집계
    const summary = result.reduce(
      (acc, tx) => {
        const dateKey = tx.date;
        if (!acc[dateKey]) {
          acc[dateKey] = { date: dateKey, hasIncome: false, hasExpense: false };
        }
        if (tx.type === "INCOME") acc[dateKey].hasIncome = true;
        if (tx.type === "EXPENSE") acc[dateKey].hasExpense = true;
        return acc;
      },
      {} as Record<string, TransactionSummary>,
    );

    return Object.values(summary);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}
