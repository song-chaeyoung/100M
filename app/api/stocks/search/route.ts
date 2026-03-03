import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { stockMaster } from "@/db/schema";
import { ilike, or, eq, and } from "drizzle-orm";

/**
 * 종목 자동완성 검색 API
 * GET /api/stocks/search?q=삼성&country=KR
 *
 * @param q      검색어 (종목코드 or 종목명 or 영문명)
 * @param country KR | US | undefined(전체)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim();
  const country = searchParams.get("country"); // KR | US | null

  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }

  try {
    const searchPattern = `%${q}%`;

    // 검색 조건: 종목코드 OR 종목명 OR 영문명 ILIKE
    const searchCondition = or(
      ilike(stockMaster.stockCode, searchPattern),
      ilike(stockMaster.stockName, searchPattern),
      ilike(stockMaster.stockNameEn, searchPattern),
    );

    // country 필터
    const countryCondition =
      country === "KR" || country === "US"
        ? eq(stockMaster.country, country)
        : undefined;

    const condition = countryCondition
      ? and(searchCondition, countryCondition)
      : searchCondition;

    const results = await db
      .select({
        stockCode: stockMaster.stockCode,
        stockName: stockMaster.stockName,
        stockNameEn: stockMaster.stockNameEn,
        market: stockMaster.market,
        country: stockMaster.country,
      })
      .from(stockMaster)
      .where(condition)
      .limit(20);

    return NextResponse.json(results);
  } catch (err) {
    console.error("[API] 종목 검색 오류:", err);
    return NextResponse.json(
      { error: "종목 검색에 실패했습니다." },
      { status: 500 },
    );
  }
}
