"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import dayjs from "dayjs";
import type { TransactionSummary } from "@/lib/api/types";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

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

/**
 * 특정 날짜의 거래 내역 조회 (API 호출)
 * @param date - "YYYY-MM-DD" 형식의 날짜
 * @returns 거래 내역 배열
 */
export async function getTransactionsByDate(date: string) {
  try {
    // 쿠키 가져오기
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/transactions?date=${date}`,
      {
        method: "GET",
        headers: {
          Cookie: cookieHeader,
        },
      },
    );

    if (!response.ok) {
      console.error("Failed to fetch transactions by date");
      return [];
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error fetching transactions by date:", error);
    return [];
  }
}

/**
 * 거래 생성 (API 호출)
 * @param data - 거래 데이터
 * @returns 생성 결과
 */
export async function createTransaction(data: {
  type: "INCOME" | "EXPENSE";
  amount: number;
  method: "CARD" | "CASH";
  date: string;
  categoryId: number;
  memo?: string;
}) {
  try {
    // 쿠키 가져오기
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/transactions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader,
        },
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || "Failed to create" };
    }

    const result = await response.json();

    // 캐시 무효화
    revalidatePath("/");

    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating transaction:", error);
    return { success: false, error: "Failed to create transaction" };
  }
}

/**
 * 거래 수정 (API 호출)
 * @param id - 거래 ID
 * @param data - 수정할 데이터
 * @returns 수정 결과
 */
export async function updateTransaction(
  id: number,
  data: {
    type: "INCOME" | "EXPENSE";
    amount: number;
    method: "CARD" | "CASH";
    date: string;
    categoryId: number;
    memo?: string;
  },
) {
  try {
    // 쿠키 가져오기
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/transactions?id=${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader,
        },
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || "Failed to update" };
    }

    const result = await response.json();

    // 캐시 무효화
    revalidatePath("/");

    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating transaction:", error);
    return { success: false, error: "Failed to update transaction" };
  }
}

/**
 * 거래 삭제 (API 호출)
 * @param id - 거래 ID
 * @returns 삭제 결과
 */
export async function deleteTransaction(id: number) {
  try {
    // 쿠키 가져오기
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/transactions?id=${id}`,
      {
        method: "DELETE",
        headers: {
          Cookie: cookieHeader,
        },
      },
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || "Failed to delete" };
    }

    // 캐시 무효화
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return { success: false, error: "Failed to delete transaction" };
  }
}
