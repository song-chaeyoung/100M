"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import dayjs from "dayjs";
import type { TransactionSummary, TransactionType } from "@/lib/api/types";
import { revalidatePath } from "next/cache";

/**
 * 특정 월의 거래 내역 요약 조회
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

    const startDate = dayjs(month).startOf("month").format("YYYY-MM-DD");
    const endDate = dayjs(month).endOf("month").format("YYYY-MM-DD");

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

    const summary = result.reduce(
      (acc, tx) => {
        const dateKey = tx.date;
        if (!acc[dateKey]) {
          acc[dateKey] = { date: dateKey, hasIncome: false, hasExpense: false, hasSaving: false };
        }
        if (tx.type === "INCOME") acc[dateKey].hasIncome = true;
        if (tx.type === "EXPENSE") acc[dateKey].hasExpense = true;
        if (tx.type === "SAVING") acc[dateKey].hasSaving = true;
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
 * 특정 날짜의 거래 내역 조회
 * @param date - "YYYY-MM-DD" 형식의 날짜
 * @returns 거래 내역 배열
 */
export async function getTransactionsByDate(date: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    const result = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        amount: transactions.amount,
        type: transactions.type,
        method: transactions.method,
        date: transactions.date,
        categoryId: transactions.categoryId,
        memo: transactions.memo,
        isFixed: transactions.isFixed,
        fixedExpenseId: transactions.fixedExpenseId,
        linkedAssetTransactionId: transactions.linkedAssetTransactionId,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
          icon: categories.icon,
          type: categories.type,
        },
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, session.user.id),
          eq(transactions.date, date),
        ),
      )
      .orderBy(transactions.createdAt);

    return result;
  } catch (error) {
    console.error("Error fetching transactions by date:", error);
    return [];
  }
}

/**
 * 거래 생성
 * @param data - 거래 데이터
 * @returns 생성 결과
 */
export async function createTransaction(data: {
  type: TransactionType;
  amount: number;
  method?: "CARD" | "CASH";
  date: string;
  categoryId?: number;
  memo?: string;
  linkedAssetTransactionId?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // 유효성 검사
    if (!data.type || !data.amount || !data.date) {
      return { success: false, error: "Missing required fields" };
    }

    // INCOME/EXPENSE는 categoryId, method 필수
    if (data.type === "INCOME" || data.type === "EXPENSE") {
      if (!data.categoryId) {
        return { success: false, error: "Category is required for INCOME/EXPENSE" };
      }
      if (!data.method) {
        return { success: false, error: "Method is required for INCOME/EXPENSE" };
      }
    }

    const result = await db
      .insert(transactions)
      .values({
        userId: session.user.id,
        type: data.type,
        amount: data.amount.toString(),
        method: data.type === "SAVING" ? null : data.method,
        date: data.date,
        categoryId: data.categoryId || null,
        memo: data.memo || null,
        isFixed: false,
        linkedAssetTransactionId: data.linkedAssetTransactionId || null,
      })
      .returning();

    revalidatePath("/");

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Error creating transaction:", error);
    return { success: false, error: "Failed to create transaction" };
  }
}

/**
 * 거래 수정
 * @param id - 거래 ID
 * @param data - 수정할 데이터
 * @returns 수정 결과
 */
export async function updateTransaction(
  id: number,
  data: {
    type: TransactionType;
    amount: number;
    method?: "CARD" | "CASH";
    date: string;
    categoryId?: number;
    memo?: string;
    linkedAssetTransactionId?: number;
  },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // 본인의 거래인지 확인
    const existing = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      return { success: false, error: "Transaction not found" };
    }

    const result = await db
      .update(transactions)
      .set({
        type: data.type,
        amount: data.amount.toString(),
        method: data.type === "SAVING" ? null : data.method,
        date: data.date,
        categoryId: data.categoryId || null,
        memo: data.memo || null,
        linkedAssetTransactionId: data.linkedAssetTransactionId || null,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id))
      .returning();

    revalidatePath("/");

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Error updating transaction:", error);
    return { success: false, error: "Failed to update transaction" };
  }
}

/**
 * 거래 삭제
 * @param id - 거래 ID
 * @returns 삭제 결과
 */
export async function deleteTransaction(id: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // 본인의 거래인지 확인
    const existing = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      return { success: false, error: "Transaction not found" };
    }

    await db.delete(transactions).where(eq(transactions.id, id));

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return { success: false, error: "Failed to delete transaction" };
  }
}
