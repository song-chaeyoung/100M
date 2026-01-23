import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { transactions } from "@/db/schema";
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

    // 특정 날짜의 거래 내역 조회
    const result = await db
      .select()
      .from(transactions)
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
