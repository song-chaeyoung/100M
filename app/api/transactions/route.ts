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

    // 날짜별로 수입/지출/저축 여부 집계
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
      {} as Record<
        string,
        { date: string; hasIncome: boolean; hasExpense: boolean; hasSaving: boolean }
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

// POST /api/transactions - 거래 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, amount, method, date, categoryId, memo, linkedAssetTransactionId } = body;

    // 유효성 검사
    if (!type || !amount || !date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // INCOME/EXPENSE는 categoryId, method 필수
    if (type === "INCOME" || type === "EXPENSE") {
      if (!categoryId) {
        return NextResponse.json(
          { error: "Category is required for INCOME/EXPENSE" },
          { status: 400 },
        );
      }
      if (!method) {
        return NextResponse.json(
          { error: "Method is required for INCOME/EXPENSE" },
          { status: 400 },
        );
      }
    }

    // DB에 삽입
    const result = await db
      .insert(transactions)
      .values({
        userId: session.user.id,
        type,
        amount: amount.toString(),
        method: type === "SAVING" ? null : method,
        date,
        categoryId: categoryId || null,
        memo: memo || null,
        isFixed: false,
        linkedAssetTransactionId: linkedAssetTransactionId || null,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// PATCH /api/transactions?id=123 - 거래 수정
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Transaction ID required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { type, amount, method, date, categoryId, memo, linkedAssetTransactionId } = body;

    // 본인의 거래인지 확인
    const existing = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, parseInt(id)),
          eq(transactions.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    // 업데이트
    const result = await db
      .update(transactions)
      .set({
        type,
        amount: amount.toString(),
        method: type === "SAVING" ? null : method,
        date,
        categoryId: categoryId || null,
        memo: memo || null,
        linkedAssetTransactionId: linkedAssetTransactionId || null,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, parseInt(id)))
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// DELETE /api/transactions?id=123 - 거래 삭제
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Transaction ID required" },
        { status: 400 },
      );
    }

    // 본인의 거래인지 확인
    const existing = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, parseInt(id)),
          eq(transactions.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    // 삭제
    await db.delete(transactions).where(eq(transactions.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
