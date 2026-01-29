"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { goals, transactions, assets } from "@/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";
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
export async function getDashboardData(): Promise<DashboardData> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        goal: { targetAmount: 0, initialAmount: 0 },
        totalSummary: { totalIncome: 0, totalExpense: 0, totalAssets: 0 },
        monthlySummary: { income: 0, expense: 0, saving: 0 },
      };
    }

    const userId = session.user.id;
    const now = dayjs();
    const monthStart = now.startOf("month").format("YYYY-MM-DD");
    const monthEnd = now.endOf("month").format("YYYY-MM-DD");

    const [activeGoal] = await db
      .select({
        targetAmount: goals.targetAmount,
        initialAmount: goals.initialAmount,
      })
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.isActive, true)))
      .limit(1);

    const [totalSummary] = await db
      .select({
        totalIncome: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'INCOME' THEN ${transactions.amount} ELSE 0 END), 0)`,
        totalExpense: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'EXPENSE' THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(eq(transactions.userId, userId));

    const [assetSummary] = await db
      .select({
        totalAssets: sql<string>`COALESCE(SUM(${assets.balance}), 0)`,
      })
      .from(assets)
      .where(and(eq(assets.userId, userId), eq(assets.isActive, true)));

    const [monthlySummary] = await db
      .select({
        income: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'INCOME' THEN ${transactions.amount} ELSE 0 END), 0)`,
        expense: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'EXPENSE' THEN ${transactions.amount} ELSE 0 END), 0)`,
        saving: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'SAVING' THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, monthStart),
          lte(transactions.date, monthEnd)
        )
      );

    return {
      goal: activeGoal
        ? {
            targetAmount: Number(activeGoal.targetAmount),
            initialAmount: Number(activeGoal.initialAmount),
          }
        : { targetAmount: 0, initialAmount: 0 },
      totalSummary: {
        totalIncome: Number(totalSummary?.totalIncome ?? 0),
        totalExpense: Number(totalSummary?.totalExpense ?? 0),
        totalAssets: Number(assetSummary?.totalAssets ?? 0),
      },
      monthlySummary: {
        income: Number(monthlySummary?.income ?? 0),
        expense: Number(monthlySummary?.expense ?? 0),
        saving: Number(monthlySummary?.saving ?? 0),
      },
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return {
      goal: { targetAmount: 0, initialAmount: 0 },
      totalSummary: { totalIncome: 0, totalExpense: 0, totalAssets: 0 },
      monthlySummary: { income: 0, expense: 0, saving: 0 },
    };
  }
}
