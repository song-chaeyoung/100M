"use server";

import { db } from "@/db";
import {
  assets,
  assetTransactions,
  categories,
  goldPrices,
  goldTrades,
  transactions,
} from "@/db/schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { withAuth } from "@/lib/with-auth";
import {
  goldBuyInputSchema,
  goldSellInputSchema,
  type GoldBuyInput,
  type GoldSellInput,
} from "@/lib/validations/gold";
import { fetchKRXGoldPrice } from "@/lib/krx-gold";
import {
  calculateGoldRealizedProfit,
  calculateGoldTradeAmount,
  calculateWeightedAverageGoldBuyPrice,
} from "@/lib/gold/calc";

const GOLD_ONLY_ERROR = "GOLD 타입 자산 계좌를 선택하세요.";

function formatGram(value: number): string {
  return value.toFixed(6);
}

function formatPrice(value: number): string {
  return value.toFixed(2);
}

function getRoundedKrw(value: number): number {
  return Math.round(value);
}

async function getInvestmentCategoryId() {
  const [category] = await db
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

  return category?.id ?? null;
}

interface GoldPriceSnapshot {
  pricePerGram: number;
  priceDate: string;
  source: string;
  isStale: boolean;
}

async function getLatestGoldPriceWithFallbackInternal(): Promise<GoldPriceSnapshot> {
  try {
    const latestFromApi = await fetchKRXGoldPrice();

    await db
      .insert(goldPrices)
      .values({
        pricePerGram: formatPrice(latestFromApi.pricePerGram),
        priceDate: latestFromApi.priceDate,
        source: "KRX_OPEN_API",
        rawPayload: latestFromApi.rawPayload,
      })
      .onConflictDoUpdate({
        target: [goldPrices.priceDate],
        set: {
          pricePerGram: sql`excluded.price_per_gram`,
          source: sql`excluded.source`,
          rawPayload: sql`excluded.raw_payload`,
          updatedAt: sql`now()`,
        },
      });

    return {
      pricePerGram: latestFromApi.pricePerGram,
      priceDate: latestFromApi.priceDate,
      source: "KRX_OPEN_API",
      isStale: false,
    };
  } catch (apiError) {
    console.error("[gold] KRX 시세 조회 실패, 캐시 폴백 시도", apiError);

    const [latestCached] = await db
      .select({
        pricePerGram: goldPrices.pricePerGram,
        priceDate: goldPrices.priceDate,
        source: goldPrices.source,
      })
      .from(goldPrices)
      .orderBy(desc(goldPrices.priceDate), desc(goldPrices.updatedAt))
      .limit(1);

    if (!latestCached) {
      throw new Error("KRX 금 시세를 가져오지 못했고 캐시 데이터도 없습니다.");
    }

    return {
      pricePerGram: Number(latestCached.pricePerGram),
      priceDate: latestCached.priceDate,
      source: latestCached.source,
      isStale: true,
    };
  }
}

export async function getLatestGoldPriceWithFallback() {
  return withAuth(async () => {
    try {
      const result = await getLatestGoldPriceWithFallbackInternal();
      return { success: true, data: result };
    } catch (error) {
      console.error("[gold] getLatestGoldPriceWithFallback error:", error);
      return { success: false, error: "금 시세 조회에 실패했습니다." };
    }
  });
}

/**
 * GOLD 자산 평가액 동기화
 * balance = round(gold_gram * latest_price_per_gram)
 */
export async function syncGoldAssetBalance(assetId: number, userId: string) {
  const [asset] = await db
    .select({
      id: assets.id,
      userId: assets.userId,
      type: assets.type,
      goldGram: assets.goldGram,
    })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.userId, userId)))
    .limit(1);

  if (!asset || asset.type !== "GOLD") {
    throw new Error("GOLD 자산이 아니거나 접근 권한이 없습니다.");
  }

  const priceSnapshot = await getLatestGoldPriceWithFallbackInternal();
  const evalAmount = getRoundedKrw(
    Number(asset.goldGram) * priceSnapshot.pricePerGram,
  );

  await db
    .update(assets)
    .set({
      balance: evalAmount.toString(),
      updatedAt: new Date(),
    })
    .where(and(eq(assets.id, assetId), eq(assets.userId, userId)));

  return {
    ...priceSnapshot,
    balance: evalAmount,
  };
}

export async function createGoldBuy(data: GoldBuyInput) {
  return withAuth(async (userId) => {
    try {
      const parsed = goldBuyInputSchema.safeParse(data);
      if (!parsed.success) {
        return {
          success: false,
          error: z.flattenError(parsed.error).fieldErrors,
        };
      }

      const [asset] = await db
        .select({
          id: assets.id,
          type: assets.type,
          goldGram: assets.goldGram,
          goldAvgBuyPrice: assets.goldAvgBuyPrice,
        })
        .from(assets)
        .where(and(eq(assets.id, parsed.data.assetId), eq(assets.userId, userId)))
        .limit(1);

      if (!asset) {
        return { success: false, error: "자산이 존재하지 않습니다." };
      }
      if (asset.type !== "GOLD") {
        return { success: false, error: GOLD_ONLY_ERROR };
      }

      const oldGram = Number(asset.goldGram);
      const oldAvgPrice = Number(asset.goldAvgBuyPrice);
      const buyGram = parsed.data.gram;
      const buyPricePerGram = parsed.data.pricePerGram;
      const amountKrw = calculateGoldTradeAmount(buyGram, buyPricePerGram);

      const newGram = oldGram + buyGram;
      const newAvgPrice = calculateWeightedAverageGoldBuyPrice(
        oldGram,
        oldAvgPrice,
        buyGram,
        buyPricePerGram,
      );

      const memo =
        parsed.data.memo?.trim() || `금 매수 ${buyGram.toFixed(6)}g`;
      const investCategoryId = await getInvestmentCategoryId();

      const trade = await db.transaction(async (tx) => {
        const [createdTrade] = await tx
          .insert(goldTrades)
          .values({
            userId,
            assetId: parsed.data.assetId,
            type: "BUY",
            gram: formatGram(buyGram),
            pricePerGram: formatPrice(buyPricePerGram),
            amountKrw: amountKrw.toString(),
            realizedProfit: null,
            tradeDate: parsed.data.tradeDate,
            memo: parsed.data.memo ?? null,
          })
          .returning();

        const [assetTx] = await tx
          .insert(assetTransactions)
          .values({
            userId,
            assetId: parsed.data.assetId,
            type: "WITHDRAW",
            amount: amountKrw.toString(),
            date: parsed.data.tradeDate,
            memo,
            isFixed: false,
          })
          .returning();

        await tx.insert(transactions).values({
          userId,
          type: "SAVING",
          categoryId: investCategoryId,
          amount: amountKrw.toString(),
          date: parsed.data.tradeDate,
          memo,
          method: null,
          isFixed: false,
          linkedAssetTransactionId: assetTx.id,
        });

        await tx
          .update(assets)
          .set({
            goldGram: formatGram(newGram),
            goldAvgBuyPrice: formatPrice(newAvgPrice),
            updatedAt: new Date(),
          })
          .where(and(eq(assets.id, parsed.data.assetId), eq(assets.userId, userId)));

        return createdTrade;
      });

      try {
        await syncGoldAssetBalance(parsed.data.assetId, userId);
      } catch (syncError) {
        console.error("[gold] buy 후 잔액 동기화 실패", syncError);
      }

      revalidatePath("/assets");
      revalidatePath(`/assets/${parsed.data.assetId}`);
      revalidatePath("/calendar");

      return { success: true, data: trade };
    } catch (error) {
      console.error("createGoldBuy error:", error);
      return { success: false, error: "금 매수 기록에 실패했습니다." };
    }
  });
}

export async function createGoldSell(data: GoldSellInput) {
  return withAuth(async (userId) => {
    try {
      const parsed = goldSellInputSchema.safeParse(data);
      if (!parsed.success) {
        return {
          success: false,
          error: z.flattenError(parsed.error).fieldErrors,
        };
      }

      const [asset] = await db
        .select({
          id: assets.id,
          type: assets.type,
          goldGram: assets.goldGram,
          goldAvgBuyPrice: assets.goldAvgBuyPrice,
        })
        .from(assets)
        .where(and(eq(assets.id, parsed.data.assetId), eq(assets.userId, userId)))
        .limit(1);

      if (!asset) {
        return { success: false, error: "자산이 존재하지 않습니다." };
      }
      if (asset.type !== "GOLD") {
        return { success: false, error: GOLD_ONLY_ERROR };
      }

      const oldGram = Number(asset.goldGram);
      const avgBuyPrice = Number(asset.goldAvgBuyPrice);
      const sellGram = parsed.data.gram;

      if (sellGram > oldGram) {
        return {
          success: false,
          error: `매도 수량(${sellGram})이 보유 수량(${oldGram})을 초과합니다.`,
        };
      }

      const sellPricePerGram = parsed.data.pricePerGram;
      const amountKrw = calculateGoldTradeAmount(sellGram, sellPricePerGram);
      const realizedProfit = calculateGoldRealizedProfit(
        avgBuyPrice,
        sellPricePerGram,
        sellGram,
      );
      const newGram = oldGram - sellGram;
      const newAvgPrice = newGram > 0 ? avgBuyPrice : 0;

      const memo =
        parsed.data.memo?.trim() || `금 매도 ${sellGram.toFixed(6)}g`;
      const investCategoryId = await getInvestmentCategoryId();

      const trade = await db.transaction(async (tx) => {
        const [createdTrade] = await tx
          .insert(goldTrades)
          .values({
            userId,
            assetId: parsed.data.assetId,
            type: "SELL",
            gram: formatGram(sellGram),
            pricePerGram: formatPrice(sellPricePerGram),
            amountKrw: amountKrw.toString(),
            realizedProfit: realizedProfit.toString(),
            tradeDate: parsed.data.tradeDate,
            memo: parsed.data.memo ?? null,
          })
          .returning();

        const [assetTx] = await tx
          .insert(assetTransactions)
          .values({
            userId,
            assetId: parsed.data.assetId,
            type: "DEPOSIT",
            amount: amountKrw.toString(),
            date: parsed.data.tradeDate,
            memo,
            isFixed: false,
          })
          .returning();

        await tx.insert(transactions).values({
          userId,
          type: "INCOME",
          categoryId: investCategoryId,
          amount: amountKrw.toString(),
          date: parsed.data.tradeDate,
          memo,
          method: null,
          isFixed: false,
          linkedAssetTransactionId: assetTx.id,
        });

        await tx
          .update(assets)
          .set({
            goldGram: formatGram(newGram),
            goldAvgBuyPrice: formatPrice(newAvgPrice),
            updatedAt: new Date(),
          })
          .where(and(eq(assets.id, parsed.data.assetId), eq(assets.userId, userId)));

        return createdTrade;
      });

      try {
        await syncGoldAssetBalance(parsed.data.assetId, userId);
      } catch (syncError) {
        console.error("[gold] sell 후 잔액 동기화 실패", syncError);
      }

      revalidatePath("/assets");
      revalidatePath(`/assets/${parsed.data.assetId}`);
      revalidatePath("/calendar");

      return { success: true, data: trade };
    } catch (error) {
      console.error("createGoldSell error:", error);
      return { success: false, error: "금 매도 기록에 실패했습니다." };
    }
  });
}

export async function getGoldTradesByAsset(assetId: number) {
  return withAuth(async (userId) => {
    try {
      const [asset] = await db
        .select({ id: assets.id, type: assets.type })
        .from(assets)
        .where(and(eq(assets.id, assetId), eq(assets.userId, userId)))
        .limit(1);

      if (!asset) {
        return { success: false, error: "자산이 존재하지 않습니다." };
      }
      if (asset.type !== "GOLD") {
        return { success: false, error: GOLD_ONLY_ERROR };
      }

      const rows = await db
        .select({
          id: goldTrades.id,
          userId: goldTrades.userId,
          assetId: goldTrades.assetId,
          type: goldTrades.type,
          gram: goldTrades.gram,
          pricePerGram: goldTrades.pricePerGram,
          amountKrw: goldTrades.amountKrw,
          realizedProfit: goldTrades.realizedProfit,
          tradeDate: goldTrades.tradeDate,
          memo: goldTrades.memo,
          createdAt: goldTrades.createdAt,
          updatedAt: goldTrades.updatedAt,
        })
        .from(goldTrades)
        .where(and(eq(goldTrades.assetId, assetId), eq(goldTrades.userId, userId)))
        .orderBy(desc(goldTrades.tradeDate), desc(goldTrades.createdAt));

      return { success: true, data: rows };
    } catch (error) {
      console.error("getGoldTradesByAsset error:", error);
      return { success: false, error: "금 거래 내역 조회에 실패했습니다." };
    }
  });
}

export async function getGoldRealizedProfitTotal(assetId: number) {
  return withAuth(async (userId) => {
    try {
      const [asset] = await db
        .select({ id: assets.id, type: assets.type })
        .from(assets)
        .where(and(eq(assets.id, assetId), eq(assets.userId, userId)))
        .limit(1);

      if (!asset) {
        return { success: false, error: "자산이 존재하지 않습니다." };
      }
      if (asset.type !== "GOLD") {
        return { success: false, error: GOLD_ONLY_ERROR };
      }

      const [sumRow] = await db
        .select({
          realizedProfitTotal:
            sql<string>`coalesce(sum(${goldTrades.realizedProfit}), 0)`,
        })
        .from(goldTrades)
        .where(and(eq(goldTrades.assetId, assetId), eq(goldTrades.userId, userId)));

      return {
        success: true,
        data: Number(sumRow?.realizedProfitTotal ?? 0),
      };
    } catch (error) {
      console.error("getGoldRealizedProfitTotal error:", error);
      return { success: false, error: "금 실현손익 조회에 실패했습니다." };
    }
  });
}
