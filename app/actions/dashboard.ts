"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { goals, transactions, assets } from "@/db/schema";
import { eq, and, sql, lte } from "drizzle-orm";
import dayjs from "dayjs";

export interface DashboardData {
  goal: {
    targetAmount: number;
    initialAmount: number;
  };
  totalSummary: {
    totalIncome: number;
    totalExpense: number;
    totalAssets: number;
  };
  monthlySummary: {
    income: number;
    expense: number;
    saving: number;
  };
}

/**
 * 대시보드 데이터 조회 (Server Action)
 * @returns 목표, 전체 요약, 이번 달 요약 데이터
 */
export async function getDashboardData() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
    }

    const userId = session.user.id;
    const now = dayjs();
    const today = now.format("YYYY-MM-DD");
    const monthStart = now.startOf("month").format("YYYY-MM-DD");

    const [[activeGoal], [transactionSummary], [assetSummary]] =
      await Promise.all([
        db
          .select({
            targetAmount: goals.targetAmount,
            initialAmount: goals.initialAmount,
          })
          .from(goals)
          .where(and(eq(goals.userId, userId), eq(goals.isActive, true)))
          .limit(1),
        db
          .select({
            totalIncome: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'INCOME' THEN ${transactions.amount} ELSE 0 END), 0)`,
            totalExpense: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'EXPENSE' THEN ${transactions.amount} ELSE 0 END), 0)`,
            monthlyIncome: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'INCOME' AND ${transactions.date} >= ${monthStart} THEN ${transactions.amount} ELSE 0 END), 0)`,
            monthlyExpense: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'EXPENSE' AND ${transactions.date} >= ${monthStart} THEN ${transactions.amount} ELSE 0 END), 0)`,
            monthlySaving: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'SAVING' AND ${transactions.date} >= ${monthStart} THEN ${transactions.amount} ELSE 0 END), 0)`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.userId, userId),
              lte(transactions.date, today),
            ),
          ),
        db
          .select({
            totalAssets: sql<string>`COALESCE(SUM(${assets.balance}), 0)`,
          })
          .from(assets)
          .where(and(eq(assets.userId, userId), eq(assets.isActive, true))),
      ]);

    const data: DashboardData = {
      goal: activeGoal
        ? {
            targetAmount: Number(activeGoal.targetAmount),
            initialAmount: Number(activeGoal.initialAmount),
          }
        : { targetAmount: 0, initialAmount: 0 },
      totalSummary: {
        totalIncome: Number(transactionSummary?.totalIncome ?? 0),
        totalExpense: Number(transactionSummary?.totalExpense ?? 0),
        totalAssets: Number(assetSummary?.totalAssets ?? 0),
      },
      monthlySummary: {
        income: Number(transactionSummary?.monthlyIncome ?? 0),
        expense: Number(transactionSummary?.monthlyExpense ?? 0),
        saving: Number(transactionSummary?.monthlySaving ?? 0),
      },
    };

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return { success: false, error: "대시보드 데이터 조회에 실패했습니다." };
  }
}
