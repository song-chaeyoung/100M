"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { eq, and, gte, lte, sum, sql } from "drizzle-orm";
import dayjs from "dayjs";
import type { TransactionSummary } from "@/lib/api/types";
import { revalidatePath } from "next/cache";
import {
  transactionSchema,
  type TransactionInput,
} from "@/lib/validations/transaction";

/**
 * 특정 월의 거래 내역 요약 조회
 * @param month - "YYYY-MM" 형식의 월
 * @returns 날짜별 수입/지출 여부 배열
 */
export async function getTransactionsByMonth(month: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
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
          acc[dateKey] = {
            date: dateKey,
            hasIncome: false,
            hasExpense: false,
            hasSaving: false,
          };
        }
        if (tx.type === "INCOME") acc[dateKey].hasIncome = true;
        if (tx.type === "EXPENSE") acc[dateKey].hasExpense = true;
        if (tx.type === "SAVING") acc[dateKey].hasSaving = true;
        return acc;
      },
      {} as Record<string, TransactionSummary>,
    );

    return { success: true, data: Object.values(summary) };
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return { success: false, error: "거래 내역 조회에 실패했습니다." };
  }
}

/**
 * 특정 월의 카테고리별 합계 조회
 * @param month - "YYYY-MM" 형식의 월
 * @returns 타입별 카테고리 합계 배열
 */
export async function getCategorySummaryByMonth(month: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
    }

    const startDate = dayjs(month).startOf("month").format("YYYY-MM-DD");
    const endDate = dayjs(month).endOf("month").format("YYYY-MM-DD");

    const result = await db
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        type: transactions.type,
        total: sum(transactions.amount),
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, session.user.id),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
        ),
      )
      .groupBy(
        transactions.categoryId,
        categories.name,
        categories.icon,
        transactions.type,
      );

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching category summary:", error);
    return { success: false, error: "카테고리별 요약 조회에 실패했습니다." };
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
      return { success: false, error: "인증이 필요합니다." };
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

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching transactions by date:", error);
    return { success: false, error: "거래 내역 조회에 실패했습니다." };
  }
}

/**
 * 거래 생성
 * @param data - 거래 데이터
 * @returns 생성 결과
 */
export async function createTransaction(data: TransactionInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
    }

    // Zod 검증
    const parsed = transactionSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    const result = await db
      .insert(transactions)
      .values({
        userId: session.user.id,
        type: parsed.data.type,
        amount: parsed.data.amount.toString(),
        method: parsed.data.type === "SAVING" ? null : parsed.data.method,
        date: parsed.data.date,
        categoryId: parsed.data.categoryId || null,
        memo: parsed.data.memo || null,
        isFixed: false,
        linkedAssetTransactionId: parsed.data.linkedAssetTransactionId || null,
      })
      .returning();

    revalidatePath("/");

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Error creating transaction:", error);
    return { success: false, error: "거래 생성에 실패했습니다." };
  }
}

/**
 * 거래 수정
 * @param id - 거래 ID
 * @param data - 수정할 데이터
 * @returns 수정 결과
 */
export async function updateTransaction(id: number, data: TransactionInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
    }

    // Zod 검증
    const parsed = transactionSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    // 본인의 거래인지 확인
    const existing = await db
      .select()
      .from(transactions)
      .where(
        and(eq(transactions.id, id), eq(transactions.userId, session.user.id)),
      )
      .limit(1);

    if (!existing[0]) {
      return { success: false, error: "거래를 찾을 수 없습니다." };
    }

    const result = await db
      .update(transactions)
      .set({
        type: parsed.data.type,
        amount: parsed.data.amount.toString(),
        method: parsed.data.type === "SAVING" ? null : parsed.data.method,
        date: parsed.data.date,
        categoryId: parsed.data.categoryId || null,
        memo: parsed.data.memo || null,
        linkedAssetTransactionId: parsed.data.linkedAssetTransactionId || null,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id))
      .returning();

    revalidatePath("/");

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Error updating transaction:", error);
    return { success: false, error: "거래 수정에 실패했습니다." };
  }
}

/**
 * 거래 삭제
 * @param id - 거래 ID
 * @returns 삭제 결과
 */
/**
 * 특정 월 + 카테고리별 거래 내역 조회
 * @param month - "YYYY-MM" 형식의 월
 * @param categoryId - 카테고리 ID
 * @returns 거래 내역 배열 (카테고리 정보 포함)
 */
export async function getTransactionsByMonthAndCategory(
  month: string,
  categoryId: number,
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
    }

    const startDate = dayjs(month).startOf("month").format("YYYY-MM-DD");
    const endDate = dayjs(month).endOf("month").format("YYYY-MM-DD");

    const result = await db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        type: transactions.type,
        method: transactions.method,
        date: transactions.date,
        memo: transactions.memo,
        isFixed: transactions.isFixed,
        createdAt: transactions.createdAt,
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
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
          eq(transactions.categoryId, categoryId),
        ),
      )
      .orderBy(transactions.date);

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching transactions by month and category:", error);
    return { success: false, error: "거래 내역 조회에 실패했습니다." };
  }
}

export async function deleteTransaction(id: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
    }

    // 본인의 거래인지 확인
    const existing = await db
      .select()
      .from(transactions)
      .where(
        and(eq(transactions.id, id), eq(transactions.userId, session.user.id)),
      )
      .limit(1);

    if (!existing[0]) {
      return { success: false, error: "거래를 찾을 수 없습니다." };
    }

    await db.delete(transactions).where(eq(transactions.id, id));

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return { success: false, error: "거래 삭제에 실패했습니다." };
  }
}
