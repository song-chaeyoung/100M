import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/transactions/daily?date=2026-01-15
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date"); // "2026-01-15"

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter required" },
        { status: 400 },
      );
    }

    // 특정 날짜의 거래 내역 조회 (카테고리 정보 포함)
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

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching daily transactions:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
