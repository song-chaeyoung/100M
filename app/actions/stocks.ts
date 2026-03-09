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
  type CreateStockHoldingInput,
  type UpdateStockHoldingInput,
  type BuyMoreStockHoldingInput,
  type SellPartialStockHoldingInput,
  createStockHoldingSchema,
  updateStockHoldingSchema,
  buyMoreStockHoldingSchema,
  sellPartialStockHoldingSchema,
} from "@/lib/validations/stock";
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
  fallbackExchangeRate: number | null = 1400,
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
      let fallbackPrice = Number(h.avgPrice);
      // US 주식이면 DB 시세 혹은 캐시 시세가 없을 때 원화로 변환해줘야 함
      if (h.currency === "USD") {
        fallbackPrice *= Number(
          p?.exchangeRate ?? fallbackExchangeRate ?? 1400,
        );
      }
      total += fallbackPrice * qty;
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
export async function syncAssetBalance(
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

    // 보유 종목이 없으면 cashBalance만 유지한채 잔액 재계산
    if (holdings.length === 0) {
      const [assetRow] = await db
        .select({ cashBalance: assets.cashBalance })
        .from(assets)
        .where(eq(assets.id, assetId));
      await db
        .update(assets)
        .set({
          balance: assetRow?.cashBalance ?? "0",
          updatedAt: new Date(),
        })
        .where(and(eq(assets.id, assetId), eq(assets.userId, userId)));
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

    const hasUS = holdings.some((h) => h.country === "US");
    let recentExchangeRate: string | null = null;

    if (hasUS) {
      // fallback 환율: DB에서 가장 최근 환율 조회
      recentExchangeRate = await db
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
    }

    if (missingUS.length > 0) {
      const US_MARKETS = new Set(["NYSE", "NASDAQ", "AMEX"]);

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

    const stockEval = calcTotalBalance(
      holdings,
      priceMap,
      recentExchangeRate ? Number(recentExchangeRate) : null,
    );

    // 5. cashBalance 조회 후 balance = 주식평가 + 예수금
    const [assetRow] = await db
      .select({ cashBalance: assets.cashBalance })
      .from(assets)
      .where(eq(assets.id, assetId));
    const cashBal = Number(assetRow?.cashBalance ?? 0);
    const totalBalance = stockEval + cashBal;

    // 6. assets.balance 업데이트
    await db
      .update(assets)
      .set({
        balance: Math.round(totalBalance).toString(),
        updatedAt: new Date(),
      })
      .where(and(eq(assets.id, assetId), eq(assets.userId, userId)));
  } catch (err) {
    // 잔액 동기화 실패해도 보유내역 CRUD는 성공 처리
    console.error("[syncAssetBalance] error:", err);
  }
}

// ─────────────────────────────────────────────
// 추매 (추가 매수)
// ─────────────────────────────────────────────

/**
 * 추매: 기존 보유 종목에 수량 추가 + 평단가 재계산 + 달력 거래 생성
 */
export async function buyMoreStockHolding(data: BuyMoreStockHoldingInput) {
  return withAuth(async (userId) => {
    try {
      const parsed = buyMoreStockHoldingSchema.safeParse(data);
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

      // ① 예수금 잔액 검증 (DB 작업 전에 먼저 확인)
      const [assetRow] = await db
        .select({ cashBalance: assets.cashBalance })
        .from(assets)
        .where(eq(assets.id, existing.assetId));
      const currentCash = Number(assetRow?.cashBalance ?? 0);
      if (currentCash < investmentKRW) {
        return {
          success: false,
          error: `예수금이 부족합니다. (예수금: ${currentCash.toLocaleString()}원 / 필요: ${investmentKRW.toLocaleString()}원)`,
        };
      }

      // 가중평균 평단가 계산
      // new_avg = (old_qty × old_avg + new_qty × buy_price) / (old_qty + new_qty)
      const oldQty = Number(existing.quantity);
      const oldAvg = Number(existing.avgPrice);
      const newQty = oldQty + quantity;
      const newAvg = (oldQty * oldAvg + quantity * buyPrice) / newQty;

      // ② 보유내역 업데이트
      await db
        .update(stockHoldings)
        .set({
          quantity: newQty.toString(),
          avgPrice: newAvg.toFixed(2),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(stockHoldings.id, holdingId),
            eq(stockHoldings.userId, userId),
          ),
        );

      // ③ assetTransaction (WITHDRAW) 생성 - 매수 = 예수금 출금
      const memo = `주식 추매: ${existing.stockName} ${quantity}주`;
      const [assetTx] = await db
        .insert(assetTransactions)
        .values({
          userId,
          assetId: existing.assetId,
          type: "WITHDRAW",
          amount: investmentKRW.toString(),
          date: purchaseDate,
          memo,
          isFixed: false,
        })
        .returning();

      // ④ "투자" 기본 카테고리 자동 조회
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

      // ⑤ transaction (SAVING) 생성 → 달력에 표시
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

      // ⑥ 예수금 조건부 차감 (원자적 업데이트)
      const [updatedAsset] = await db
        .update(assets)
        .set({
          cashBalance: sql`${assets.cashBalance}::numeric - ${investmentKRW}`,
        })
        .where(
          and(
            eq(assets.id, existing.assetId),
            eq(assets.userId, userId),
            sql`${assets.cashBalance}::numeric >= ${investmentKRW}`,
          ),
        )
        .returning();

      if (!updatedAsset) {
        // 잔액 부족 시 롤백
        await db
          .delete(transactions)
          .where(
            and(
              eq(transactions.linkedAssetTransactionId, assetTx.id),
              eq(transactions.userId, userId),
            ),
          );
        await db
          .delete(assetTransactions)
          .where(
            and(
              eq(assetTransactions.id, assetTx.id),
              eq(assetTransactions.userId, userId),
            ),
          );
        await db
          .update(stockHoldings)
          .set({
            quantity: existing.quantity,
            avgPrice: existing.avgPrice,
          })
          .where(
            and(
              eq(stockHoldings.id, holdingId),
              eq(stockHoldings.userId, userId),
            ),
          );

        return {
          success: false,
          error:
            "예수금이 부족합니다. (동시 결제로 인해 잔액이 변동되었습니다.)",
        };
      }

      // ⑦ 잔액 동기화
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
// 분할매도
// ─────────────────────────────────────────────

/**
 * 분할매도: 보유 수량 차감 (전량이면 삭제) + 달력 거래 생성
 * - 평단가는 변경하지 않음 (남은 주식 손익 왜곡 방지)
 * - AssetTransaction(WITHDRAW) + Transaction(INCOME) 생성
 */
export async function sellPartialStockHolding(
  data: SellPartialStockHoldingInput,
) {
  return withAuth(async (userId) => {
    try {
      const parsed = sellPartialStockHoldingSchema.safeParse(data);
      if (!parsed.success) {
        return {
          success: false,
          error: z.flattenError(parsed.error).fieldErrors,
        };
      }

      const { holdingId, quantity, proceedsKRW, sellDate } = parsed.data;

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

      const oldQty = Number(existing.quantity);

      // 매도 수량 검증 (보유 수량 초과 불가)
      if (quantity > oldQty) {
        return {
          success: false,
          error: `매도 수량(${quantity})이 보유 수량(${oldQty})을 초과합니다.`,
        };
      }

      const remainQty = oldQty - quantity;
      const memo = `주식 매도: ${existing.stockName} ${quantity}주`;

      if (remainQty === 0) {
        // 전량 매도 → 보유내역 삭제
        await db
          .delete(stockHoldings)
          .where(
            and(
              eq(stockHoldings.id, holdingId),
              eq(stockHoldings.userId, userId),
            ),
          );
      } else {
        // 분할매도 → 수량만 차감, 평단가 유지
        await db
          .update(stockHoldings)
          .set({
            quantity: remainQty.toString(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(stockHoldings.id, holdingId),
              eq(stockHoldings.userId, userId),
            ),
          );
      }

      // ② AssetTransaction (DEPOSIT) 생성 - 매도 = 예수금 입금
      const [assetTx] = await db
        .insert(assetTransactions)
        .values({
          userId,
          assetId: existing.assetId,
          type: "DEPOSIT",
          amount: proceedsKRW.toString(),
          date: sellDate,
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

      // ④ Transaction (INCOME) 생성 → 달력에 표시
      await db.insert(transactions).values({
        userId,
        type: "INCOME",
        categoryId: investCategory?.id ?? null,
        amount: proceedsKRW.toString(),
        date: sellDate,
        memo,
        method: null,
        isFixed: false,
        linkedAssetTransactionId: assetTx.id,
      });

      // ⑤ 매도 대금 → 예수금 적립
      await db
        .update(assets)
        .set({
          cashBalance: sql`${assets.cashBalance}::numeric + ${proceedsKRW}`,
        })
        .where(and(eq(assets.id, existing.assetId), eq(assets.userId, userId)));

      // ⑥ 잔액 동기화
      await syncAssetBalance(existing.assetId, userId);

      revalidatePath("/assets");
      revalidatePath("/calendar");
      return { success: true };
    } catch (err) {
      console.error("sellPartialStockHolding error:", err);
      return { success: false, error: "매도에 실패했습니다." };
    }
  });
}

// ─────────────────────────────────────────────
// 보유내역 CRUD
// ─────────────────────────────────────────────

/**
 * 보유내역 생성
 */
export async function createStockHolding(data: CreateStockHoldingInput) {
  return withAuth(async (userId) => {
    try {
      const parsed = createStockHoldingSchema.safeParse(data);
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
        .select({
          id: assets.id,
          type: assets.type,
          cashBalance: assets.cashBalance,
        })
        .from(assets)
        .where(and(eq(assets.id, assetId), eq(assets.userId, userId)))
        .limit(1);

      if (!asset[0]) {
        return { success: false, error: "유효하지 않은 자산 계좌입니다." };
      }
      if (asset[0].type !== "STOCK") {
        return { success: false, error: "STOCK 타입 자산 계좌를 선택하세요." };
      }

      // ① 예수금 잔액 검증 (recordAsSaving 시 DB 작업 전에 먼저 확인)
      if (parsed.data.recordAsSaving && parsed.data.investmentKRW) {
        const currentCash = Number(asset[0].cashBalance ?? 0);
        if (currentCash < parsed.data.investmentKRW) {
          return {
            success: false,
            error: `예수금이 부족합니다. (예수금: ${currentCash.toLocaleString()}원 / 필요: ${parsed.data.investmentKRW.toLocaleString()}원)`,
          };
        }
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

      // 가계부에 저축으로 기록 (체크한 경우)
      if (parsed.data.recordAsSaving && parsed.data.investmentKRW) {
        const txDate = parsed.data.purchaseDate ?? getTodayKST();
        const txMemo = `주식 매수: ${stockName}`; // memo(보유내역용)와 구분

        // ② assetTransaction (WITHDRAW) 생성 - 매수 = 예수금 출금
        const [assetTx] = await db
          .insert(assetTransactions)
          .values({
            userId,
            assetId,
            type: "WITHDRAW",
            amount: parsed.data.investmentKRW.toString(),
            date: txDate,
            memo: txMemo,
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

        // ④ transaction (SAVING) 생성 + assetTransaction 연결
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

        // ⑤ 예수금 조건부 차감 (원자적 업데이트)
        const [updatedAsset] = await db
          .update(assets)
          .set({
            cashBalance: sql`${assets.cashBalance}::numeric - ${parsed.data.investmentKRW}`,
          })
          .where(
            and(
              eq(assets.id, assetId),
              eq(assets.userId, userId),
              sql`${assets.cashBalance}::numeric >= ${parsed.data.investmentKRW}`,
            ),
          )
          .returning();

        if (!updatedAsset) {
          // 잔액 부족으로 업데이트 실패 시 롤백 (TOCTOU 방어)
          await db
            .delete(transactions)
            .where(
              and(
                eq(transactions.linkedAssetTransactionId, assetTx.id),
                eq(transactions.userId, userId),
              ),
            );
          await db
            .delete(assetTransactions)
            .where(
              and(
                eq(assetTransactions.id, assetTx.id),
                eq(assetTransactions.userId, userId),
              ),
            );
          await db
            .delete(stockHoldings)
            .where(
              and(
                eq(stockHoldings.id, result.id),
                eq(stockHoldings.userId, userId),
              ),
            );

          return {
            success: false,
            error: "예수금이 부족합니다. (요청 금액보다 잔액이 적습니다.)",
          };
        }
      }

      // 모든 DB 변경 이후 실시간 시세 기반으로 자산 잔액 갱신
      await syncAssetBalance(assetId, userId);

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
  data: UpdateStockHoldingInput,
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

      const parsed = updateStockHoldingSchema.safeParse(data);
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
        .where(and(eq(stockHoldings.id, id), eq(stockHoldings.userId, userId)))
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
      await db
        .delete(stockHoldings)
        .where(and(eq(stockHoldings.id, id), eq(stockHoldings.userId, userId)));

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
