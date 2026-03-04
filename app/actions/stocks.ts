"use server";

import { withAuth } from "@/lib/with-auth";
import { db } from "@/db";
import {
  stockHoldings,
  stockPrices,
  assets,
  assetTransactions,
  transactions,
  categories,
} from "@/db/schema";
import { eq, and, inArray, sql, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  fetchKRStockPricesWithQueue,
  fetchUSStockPricesWithQueue,
} from "@/lib/kis-stocks";
import type { NewStockPrice } from "@/db/schema";

// ─────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────

/**
 * KST(UTC+9) 기준 오늘 날짜 반환 (YYYY-MM-DD)
 * toISOString()은 UTC 기준이라 오전 9시 이전에 전날 날짜를 반환하는 문제 방지
 */
function getTodayKST(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
}

type HoldingForBalance = {
  stockCode: string;
  country: string;
  currency: string;
  quantity: string;
  avgPrice: string;
};

type PriceForBalance = {
  stockCode: string;
  country?: string | null;
  krwPrice?: string | null;
  currentPrice: string;
  exchangeRate?: string | null;
};

/**
 * 보유 종목 목록과 시세 Map으로 총 평가금액(KRW) 합산
 * syncAssetBalance / getStockPricesForAsset 공통 사용
 * 제네릭으로 DB 타입(StockPrice)과 NewStockPrice 모두 수용
 */
function calcTotalBalance<P extends PriceForBalance>(
  holdings: HoldingForBalance[],
  priceMap: Map<string, P>,
): number {
  let total = 0;
  for (const h of holdings) {
    const key = `${h.stockCode}:${h.country}`;
    const p = priceMap.get(key);
    const qty = Number(h.quantity);

    if (p?.krwPrice) {
      // 실시간 KRW 환산가
      total += Number(p.krwPrice) * qty;
    } else if (p?.currentPrice && h.currency === "USD" && p.exchangeRate) {
      // krwPrice 없을 때: currentPrice × exchangeRate
      total +=
        Math.round(Number(p.currentPrice) * Number(p.exchangeRate)) * qty;
    } else {
      // 최종 fallback: 평단가 기준
      total += Number(h.avgPrice) * qty;
    }
  }
  return total;
}

// ─────────────────────────────────────────────
// 자산 잔액 동기화 (실시간 시세 기반)
// ─────────────────────────────────────────────

/**
 * 주식 자산의 balance를 실시간 평가금액(KRW)으로 갱신
 * 우선순위: 오늘 캐시 → KIS API 호출 → 평단가 fallback
 */
async function syncAssetBalance(
  assetId: number,
  userId: string,
): Promise<void> {
  try {
    // 1. 현재 보유 종목 전체 조회
    const holdings = await db
      .select()
      .from(stockHoldings)
      .where(
        and(
          eq(stockHoldings.assetId, assetId),
          eq(stockHoldings.userId, userId),
        ),
      );

    // 보유 종목이 없으면 잔액 0으로 초기화
    if (holdings.length === 0) {
      await db
        .update(assets)
        .set({ balance: "0", updatedAt: new Date() })
        .where(eq(assets.id, assetId));
      return;
    }

    // 2. 오늘 날짜 캐시 확인
    const today = getTodayKST();
    const codes = holdings.map((h) => h.stockCode);

    const cached = await db
      .select()
      .from(stockPrices)
      .where(
        and(
          inArray(stockPrices.stockCode, codes),
          eq(stockPrices.priceDate, today),
        ),
      );

    const cachedKeys = new Set(
      cached.map((c) => `${c.stockCode}:${c.country}`),
    );

    // 3. 캐시 미스 종목만 KIS API 호출
    const missingKR = holdings.filter(
      (h) => h.country === "KR" && !cachedKeys.has(`${h.stockCode}:KR`),
    );
    const missingUS = holdings.filter(
      (h) => h.country === "US" && !cachedKeys.has(`${h.stockCode}:US`),
    );

    const freshPrices: NewStockPrice[] = [];

    if (missingKR.length > 0) {
      const krPrices = await fetchKRStockPricesWithQueue(
        missingKR.map((h) => ({
          stockCode: h.stockCode,
          market: h.market as "KOSPI" | "KOSDAQ",
          stockName: h.stockName,
        })),
      );
      freshPrices.push(...krPrices);
    }

    if (missingUS.length > 0) {
      const US_MARKETS = new Set(["NYSE", "NASDAQ", "AMEX"]);

      // fallback 환율: DB에서 가장 최근 환율 조회
      const recentExchangeRate = await db
        .select({ exchangeRate: stockPrices.exchangeRate })
        .from(stockPrices)
        .where(
          and(
            eq(stockPrices.country, "US"),
            sql`${stockPrices.exchangeRate} IS NOT NULL`,
          ),
        )
        .orderBy(sql`${stockPrices.updatedAt} DESC`)
        .limit(1)
        .then((rows) => rows[0]?.exchangeRate ?? null);

      const usPrices = await fetchUSStockPricesWithQueue(
        missingUS.map((h) => ({
          stockCode: h.stockCode,
          market: (US_MARKETS.has(h.market) ? h.market : "NYSE") as
            | "NYSE"
            | "NASDAQ"
            | "AMEX",
          stockName: h.stockName,
          fallbackExchangeRate: recentExchangeRate,
        })),
      );
      freshPrices.push(...usPrices);
    }

    // 새 시세 캐시 저장
    if (freshPrices.length > 0) {
      await upsertStockPrices(freshPrices);
    }

    // 4. DB에서 최신 시세 전체 조회
    // (API 실패 종목도 이전 날짜 캐시를 활용할 수 있도록 날짜 필터 없이 조회)
    const allPrices = await db
      .select()
      .from(stockPrices)
      .where(inArray(stockPrices.stockCode, codes));

    const priceMap = new Map<string, PriceForBalance>(
      allPrices.map((p) => [`${p.stockCode}:${p.country}`, p]),
    );

    const totalBalance = calcTotalBalance(holdings, priceMap);

    // 5. assets.balance 업데이트
    await db
      .update(assets)
      .set({
        balance: Math.round(totalBalance).toString(),
        updatedAt: new Date(),
      })
      .where(eq(assets.id, assetId));

    console.log(
      `[syncAssetBalance] assetId=${assetId} balance=${Math.round(totalBalance)}`,
    );
  } catch (err) {
    // 잔액 동기화 실패해도 보유내역 CRUD는 성공 처리
    console.error("[syncAssetBalance] error:", err);
  }
}

// ─────────────────────────────────────────────
// 추매 (추가 매수)
// ─────────────────────────────────────────────

const buyMoreSchema = z.object({
  holdingId: z.number().int().positive(),
  quantity: z.number().positive("수량은 0보다 커야 합니다."),
  buyPrice: z.number().positive("매수가는 0 초과여야 합니다."),
  investmentKRW: z.number().positive("투자금액을 입력하세요."),
  purchaseDate: z.string(),
});

export type BuyMoreInput = z.infer<typeof buyMoreSchema>;

/**
 * 추매: 기존 보유 종목에 수량 추가 + 평단가 재계산 + 달력 거래 생성
 */
export async function buyMoreStockHolding(data: BuyMoreInput) {
  return withAuth(async (userId) => {
    try {
      const parsed = buyMoreSchema.safeParse(data);
      if (!parsed.success) {
        return {
          success: false,
          error: z.flattenError(parsed.error).fieldErrors,
        };
      }

      const { holdingId, quantity, buyPrice, investmentKRW, purchaseDate } =
        parsed.data;

      // 기존 보유내역 조회
      const [existing] = await db
        .select()
        .from(stockHoldings)
        .where(
          and(
            eq(stockHoldings.id, holdingId),
            eq(stockHoldings.userId, userId),
          ),
        )
        .limit(1);

      if (!existing) {
        return { success: false, error: "보유내역이 존재하지 않습니다." };
      }

      // 가중평균 평단가 계산
      // new_avg = (old_qty × old_avg + new_qty × buy_price) / (old_qty + new_qty)
      const oldQty = Number(existing.quantity);
      const oldAvg = Number(existing.avgPrice);
      const newQty = oldQty + quantity;
      const newAvg = (oldQty * oldAvg + quantity * buyPrice) / newQty;

      // ① 보유내역 업데이트
      await db
        .update(stockHoldings)
        .set({
          quantity: newQty.toString(),
          avgPrice: newAvg.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(stockHoldings.id, holdingId));

      // ② assetTransaction (DEPOSIT) 생성
      const memo = `주식 추매: ${existing.stockName} ${quantity}주`;
      const [assetTx] = await db
        .insert(assetTransactions)
        .values({
          userId,
          assetId: existing.assetId,
          type: "DEPOSIT",
          amount: investmentKRW.toString(),
          date: purchaseDate,
          memo,
          isFixed: false,
        })
        .returning();

      // ③ "투자" 기본 카테고리 자동 조회
      const [investCategory] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.name, "투자"),
            eq(categories.type, "SAVING"),
            eq(categories.isDefault, true),
            isNull(categories.userId),
          ),
        )
        .limit(1);

      // ④ transaction (SAVING) 생성 → 달력에 표시
      await db.insert(transactions).values({
        userId,
        type: "SAVING",
        categoryId: investCategory?.id ?? null,
        amount: investmentKRW.toString(),
        date: purchaseDate,
        memo,
        method: null,
        isFixed: false,
        linkedAssetTransactionId: assetTx.id,
      });

      // ④ 잔액 동기화
      await syncAssetBalance(existing.assetId, userId);

      revalidatePath("/assets");
      revalidatePath("/calendar");
      return { success: true };
    } catch (err) {
      console.error("buyMoreStockHolding error:", err);
      return { success: false, error: "추매에 실패했습니다." };
    }
  });
}

// ─────────────────────────────────────────────
// 유효성 검사
// ─────────────────────────────────────────────

const stockHoldingSchema = z.object({
  assetId: z.number().int().positive("자산 계좌를 선택하세요."),
  stockCode: z.string().min(1, "종목 코드를 입력하세요."),
  stockName: z.string().min(1, "종목명을 입력하세요."),
  country: z.enum(["KR", "US"]).default("KR"),
  market: z.string().default("KOSPI"),
  quantity: z.number().positive("수량은 0보다 커야 합니다."),
  avgPrice: z.number().positive("평단가는 0 초과여야 합니다.").multipleOf(0.01),
  currency: z.enum(["KRW", "USD"]).default("KRW"),
  memo: z.string().optional(),
  // 가계부 저축 연동
  recordAsSaving: z.boolean().default(false),
  investmentKRW: z.number().positive().optional(),
  purchaseDate: z.string().optional(),
});

export type StockHoldingInput = z.infer<typeof stockHoldingSchema>;

// ─────────────────────────────────────────────
// 보유내역 CRUD
// ─────────────────────────────────────────────

/**
 * 보유내역 생성
 */
export async function createStockHolding(data: StockHoldingInput) {
  return withAuth(async (userId) => {
    try {
      const parsed = stockHoldingSchema.safeParse(data);
      if (!parsed.success) {
        return {
          success: false,
          error: z.flattenError(parsed.error).fieldErrors,
        };
      }

      const {
        assetId,
        stockCode,
        stockName,
        country,
        quantity,
        avgPrice,
        currency,
        memo,
      } = parsed.data;

      // 자산 계좌가 해당 유저 소유인지 확인
      const asset = await db
        .select({ id: assets.id, type: assets.type })
        .from(assets)
        .where(and(eq(assets.id, assetId), eq(assets.userId, userId)))
        .limit(1);

      if (!asset[0]) {
        return { success: false, error: "유효하지 않은 자산 계좌입니다." };
      }
      if (asset[0].type !== "STOCK") {
        return { success: false, error: "STOCK 타입 자산 계좌를 선택하세요." };
      }

      // 동일 계좌에 같은 종목 중복 등록 방지
      const duplicate = await db
        .select({ id: stockHoldings.id })
        .from(stockHoldings)
        .where(
          and(
            eq(stockHoldings.userId, userId),
            eq(stockHoldings.assetId, assetId),
            eq(stockHoldings.stockCode, stockCode),
            eq(stockHoldings.country, country),
          ),
        )
        .limit(1);

      if (duplicate[0]) {
        return {
          success: false,
          error:
            "이미 같은 계좌에 동일한 종목이 등록되어 있습니다. 추매 기능을 이용하세요.",
        };
      }

      const [result] = await db
        .insert(stockHoldings)
        .values({
          userId,
          assetId,
          stockCode,
          stockName,
          country,
          market: parsed.data.market ?? (country === "US" ? "NYSE" : "KOSPI"), // market 저장
          quantity: quantity.toString(),
          avgPrice: avgPrice.toString(),
          currency,
          memo: memo ?? null,
        })
        .returning();

      // 실시간 시세 기반으로 자산 잔액 자동 갱신
      await syncAssetBalance(assetId, userId);

      // 가계부에 저축으로 기록 (체크한 경우)
      if (parsed.data.recordAsSaving && parsed.data.investmentKRW) {
        const txDate = parsed.data.purchaseDate ?? getTodayKST();
        const txMemo = `주식 매수: ${stockName}`; // memo(보유내역용)와 구분

        // ① assetTransaction (DEPOSIT) 생성
        const [assetTx] = await db
          .insert(assetTransactions)
          .values({
            userId,
            assetId,
            type: "DEPOSIT",
            amount: parsed.data.investmentKRW.toString(),
            date: txDate,
            memo: txMemo,
            isFixed: false,
          })
          .returning();

        // ② "투자" 기본 카테고리 자동 조회
        const [investCategory] = await db
          .select({ id: categories.id })
          .from(categories)
          .where(
            and(
              eq(categories.name, "투자"),
              eq(categories.type, "SAVING"),
              eq(categories.isDefault, true),
              isNull(categories.userId),
            ),
          )
          .limit(1);

        // ③ transaction (SAVING) 생성 + assetTransaction 연결
        await db.insert(transactions).values({
          userId,
          type: "SAVING",
          categoryId: investCategory?.id ?? null,
          amount: parsed.data.investmentKRW.toString(),
          date: txDate,
          memo: txMemo,
          method: null,
          isFixed: false,
          linkedAssetTransactionId: assetTx.id,
        });
      }

      revalidatePath("/assets");
      revalidatePath("/calendar");
      return { success: true, data: result };
    } catch (err) {
      console.error("createStockHolding error:", err);
      return { success: false, error: "보유내역 생성에 실패했습니다." };
    }
  });
}

/**
 * 보유내역 수정
 */
export async function updateStockHolding(
  id: number,
  data: Partial<StockHoldingInput>,
) {
  return withAuth(async (userId) => {
    try {
      const existing = await db
        .select()
        .from(stockHoldings)
        .where(and(eq(stockHoldings.id, id), eq(stockHoldings.userId, userId)))
        .limit(1);

      if (!existing[0]) {
        return { success: false, error: "보유내역을 찾을 수 없습니다." };
      }

      const parsed = stockHoldingSchema.partial().safeParse(data);
      if (!parsed.success) {
        return {
          success: false,
          error: z.flattenError(parsed.error).fieldErrors,
        };
      }

      const d = parsed.data;
      const [result] = await db
        .update(stockHoldings)
        .set({
          ...(d.quantity !== undefined && { quantity: d.quantity.toString() }), // decimal
          ...(d.avgPrice !== undefined && { avgPrice: d.avgPrice.toString() }),
          ...(d.memo !== undefined && { memo: d.memo ?? null }),
          updatedAt: new Date(),
        })
        .where(eq(stockHoldings.id, id))
        .returning();

      // 실시간 시세 기반으로 자산 잔액 자동 갱신
      await syncAssetBalance(existing[0].assetId, userId);

      revalidatePath("/assets");
      return { success: true, data: result };
    } catch (err) {
      console.error("updateStockHolding error:", err);
      return { success: false, error: "보유내역 수정에 실패했습니다." };
    }
  });
}

/**
 * 보유내역 삭제
 */
export async function deleteStockHolding(id: number) {
  return withAuth(async (userId) => {
    try {
      const existing = await db
        .select()
        .from(stockHoldings)
        .where(and(eq(stockHoldings.id, id), eq(stockHoldings.userId, userId)))
        .limit(1);

      if (!existing[0]) {
        return { success: false, error: "보유내역을 찾을 수 없습니다." };
      }

      const { assetId } = existing[0];
      await db.delete(stockHoldings).where(eq(stockHoldings.id, id));

      // 삭제 후 실시간 시세 기반으로 자산 잔액 자동 갱신
      await syncAssetBalance(assetId, userId);

      revalidatePath("/assets");
      return { success: true };
    } catch (err) {
      console.error("deleteStockHolding error:", err);
      return { success: false, error: "보유내역 삭제에 실패했습니다." };
    }
  });
}

/**
 * 자산 계좌별 보유내역 조회
 */
export async function getStockHoldingsByAsset(assetId: number) {
  return withAuth(async (userId) => {
    try {
      const results = await db
        .select()
        .from(stockHoldings)
        .where(
          and(
            eq(stockHoldings.assetId, assetId),
            eq(stockHoldings.userId, userId),
          ),
        )
        .orderBy(stockHoldings.stockCode);

      return { success: true, data: results };
    } catch (err) {
      console.error("getStockHoldingsByAsset error:", err);
      return { success: false, error: "보유내역 조회에 실패했습니다." };
    }
  });
}

// ─────────────────────────────────────────────
// 시세 캐싱 로직
// ─────────────────────────────────────────────

async function upsertStockPrices(prices: NewStockPrice[]) {
  if (prices.length === 0) return;
  await db
    .insert(stockPrices)
    .values(prices)
    .onConflictDoUpdate({
      target: [stockPrices.stockCode, stockPrices.country],
      set: {
        stockName: sql`excluded.stock_name`,
        currentPrice: sql`excluded.current_price`,
        previousClose: sql`excluded.previous_close`,
        changeRate: sql`excluded.change_rate`,
        krwPrice: sql`excluded.krw_price`,
        exchangeRate: sql`excluded.exchange_rate`,
        currency: sql`excluded.currency`,
        priceDate: sql`excluded.price_date`,
        updatedAt: sql`now()`,
      },
    });
}

/**
 * 자산 계좌의 보유 종목 시세 조회 (캐시 → 없으면 한투 API 호출)
 */
export async function getStockPricesForAsset(assetId: number) {
  return withAuth(async (userId) => {
    try {
      // 1. 보유 종목 조회 (balance 계산용 quantity/avgPrice/currency 포함)
      const holdings = await db
        .select({
          stockCode: stockHoldings.stockCode,
          stockName: stockHoldings.stockName,
          country: stockHoldings.country,
          market: stockHoldings.market,
          quantity: stockHoldings.quantity,
          avgPrice: stockHoldings.avgPrice,
          currency: stockHoldings.currency,
        })
        .from(stockHoldings)
        .where(
          and(
            eq(stockHoldings.assetId, assetId),
            eq(stockHoldings.userId, userId),
          ),
        );

      if (holdings.length === 0) return { success: true, data: [] };

      // 2. 오늘 날짜 캐시 확인
      const today = getTodayKST();
      const codes = holdings.map((h) => h.stockCode);

      const cached = await db
        .select()
        .from(stockPrices)
        .where(
          and(
            inArray(stockPrices.stockCode, codes),
            eq(stockPrices.priceDate, today),
          ),
        );

      // 3. 캐시 없는 종목만 API 호출
      const cachedKeys = new Set(
        cached.map((c) => `${c.stockCode}:${c.country}`),
      );

      const missingKR = holdings.filter(
        (h) => h.country === "KR" && !cachedKeys.has(`${h.stockCode}:KR`),
      );
      const missingUS = holdings.filter(
        (h) => h.country === "US" && !cachedKeys.has(`${h.stockCode}:US`),
      );

      const freshPrices: NewStockPrice[] = [];

      if (missingKR.length > 0) {
        const krPrices = await fetchKRStockPricesWithQueue(
          missingKR.map((h) => ({
            stockCode: h.stockCode,
            market: h.market as "KOSPI" | "KOSDAQ", // 실제 market 사용
            stockName: h.stockName,
          })),
        );
        freshPrices.push(...krPrices);
      }

      if (missingUS.length > 0) {
        const US_MARKETS = new Set(["NYSE", "NASDAQ", "AMEX"]);

        // DB에 저장된 최근 환율 (장 마감 시 KIS exrt가 빈 문자열로 오는 경우 fallback용)
        const recentExchangeRate = await db
          .select({ exchangeRate: stockPrices.exchangeRate })
          .from(stockPrices)
          .where(
            and(
              eq(stockPrices.country, "US"),
              sql`${stockPrices.exchangeRate} IS NOT NULL`,
            ),
          )
          .orderBy(sql`${stockPrices.updatedAt} DESC`)
          .limit(1)
          .then((rows) => rows[0]?.exchangeRate ?? null);

        if (recentExchangeRate) {
          console.log(`[KIS] fallback 환율 사용: ${recentExchangeRate}`);
        }

        const usPrices = await fetchUSStockPricesWithQueue(
          missingUS.map((h) => ({
            stockCode: h.stockCode,
            market: (US_MARKETS.has(h.market) ? h.market : "NYSE") as
              | "NYSE"
              | "NASDAQ"
              | "AMEX",
            stockName: h.stockName,
            fallbackExchangeRate: recentExchangeRate,
          })),
        );
        freshPrices.push(...usPrices);
      }

      if (freshPrices.length > 0) {
        await upsertStockPrices(freshPrices);
      }

      // 4. 최신 시세 전체 반환
      const allPrices = await db
        .select()
        .from(stockPrices)
        .where(inArray(stockPrices.stockCode, codes));

      // 5. balance 갱신은 syncAssetBalance에 위임 (중복 로직 제거)
      //    직전에 upsertStockPrices로 오늘 시세를 저장했으므로 캐시 히트 → KIS API 이중 호출 없음
      await syncAssetBalance(assetId, userId);

      return { success: true, data: allPrices };
    } catch (err) {
      console.error("getStockPricesForAsset error:", err);
      return { success: false, error: "시세 조회에 실패했습니다." };
    }
  });
}
