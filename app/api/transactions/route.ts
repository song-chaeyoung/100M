import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import dayjs from "dayjs";

// GET /api/transactions?month=2026-01
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get("month"); // "2026-01"

    if (!month) {
      return NextResponse.json(
        { error: "Month parameter required" },
        { status: 400 },
      );
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
      {} as Record<
        string,
        { date: string; hasIncome: boolean; hasExpense: boolean }
      >,
    );

    return NextResponse.json(Object.values(summary));
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
