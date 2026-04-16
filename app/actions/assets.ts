"use server";

import { withAuth } from "@/lib/with-auth";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { eq, and, not } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assetSchema, type AssetInput } from "@/lib/validations/asset";
import { z } from "zod";
import { syncGoldAssetBalance } from "./gold";

/**
 * 자산 계좌 생성
 */
export async function createAsset(data: AssetInput) {
  return withAuth(async (userId) => {
    try {
      const parsed = assetSchema.safeParse(data);
      if (!parsed.success) {
        return {
          success: false,
          error: z.flattenError(parsed.error).fieldErrors,
        };
      }

      const isGoldAsset = parsed.data.type === "GOLD";
      const initialBalance = isGoldAsset ? 0 : parsed.data.balance;

      const [result] = await db
        .insert(assets)
        .values({
          userId,
          name: parsed.data.name,
          type: parsed.data.type,
          balance: initialBalance.toString(),
          goldGram: isGoldAsset ? "0.000000" : "0",
          goldAvgBuyPrice: isGoldAsset ? "0.00" : "0",
          institution: parsed.data.institution || null,
          accountNumber: parsed.data.accountNumber || null,
          interestRate: parsed.data.interestRate?.toString() || null,
          icon: parsed.data.icon || null,
          color: parsed.data.color || null,
          isActive: parsed.data.isActive,
        })
        .returning();

      if (isGoldAsset) {
        try {
          await syncGoldAssetBalance(result.id, userId);
        } catch (syncError) {
          console.error("[assets] GOLD 잔액 동기화 실패", syncError);
        }
      }

      revalidatePath("/");

      return { success: true, data: result };
    } catch (error) {
      console.error("Error creating asset:", error);
      return { success: false, error: "자산 계좌 생성에 실패했습니다." };
    }
  });
}

/**
 * 자산 계좌 목록 조회
 */
export async function getAssets() {
  return withAuth(async (userId) => {
    try {
      const result = await db
        .select({
          id: assets.id,
          name: assets.name,
          type: assets.type,
          balance: assets.balance,
          cashBalance: assets.cashBalance,
          goldGram: assets.goldGram,
          goldAvgBuyPrice: assets.goldAvgBuyPrice,
          institution: assets.institution,
          accountNumber: assets.accountNumber,
          interestRate: assets.interestRate,
          icon: assets.icon,
          color: assets.color,
          isActive: assets.isActive,
          createdAt: assets.createdAt,
          updatedAt: assets.updatedAt,
        })
        .from(assets)
        .where(eq(assets.userId, userId))
        .orderBy(assets.name);

      return { success: true, data: result };
    } catch (error) {
      console.error("Error fetching assets:", error);
      return { success: false, error: "자산 계좌 조회에 실패했습니다." };
    }
  });
}

/**
 * 자산 계좌 단건 조회
 */
export async function getAssetById(id: number) {
  return withAuth(async (userId) => {
    try {
      const result = await db
        .select({
          id: assets.id,
          name: assets.name,
          type: assets.type,
          balance: assets.balance,
          cashBalance: assets.cashBalance,
          goldGram: assets.goldGram,
          goldAvgBuyPrice: assets.goldAvgBuyPrice,
          institution: assets.institution,
          accountNumber: assets.accountNumber,
          interestRate: assets.interestRate,
          icon: assets.icon,
          color: assets.color,
          isActive: assets.isActive,
          createdAt: assets.createdAt,
          updatedAt: assets.updatedAt,
        })
        .from(assets)
        .where(and(eq(assets.id, id), eq(assets.userId, userId)))
        .limit(1);

      const asset = result[0];
      if (!asset) {
        return { success: false, error: "자산을 찾을 수 없습니다." };
      }

      return { success: true, data: asset };
    } catch (error) {
      console.error("Error fetching asset:", error);
      return { success: false, error: "자산 조회에 실패했습니다." };
    }
  });
}

/**
 * 자산 계좌 수정
 */
export async function updateAsset(id: number, data: Partial<AssetInput>) {
  return withAuth(async (userId) => {
    try {
      // 존재 여부 확인
      const existing = await db
        .select()
        .from(assets)
        .where(and(eq(assets.id, id), eq(assets.userId, userId)))
        .limit(1);

      if (!existing[0]) {
        return { success: false, error: "자산 계좌가 존재하지 않습니다." };
      }

      const parsed = assetSchema.partial().safeParse(data);
      if (!parsed.success) {
        return {
          success: false,
          error: z.flattenError(parsed.error).fieldErrors,
        };
      }

      const nextType = parsed.data.type ?? existing[0].type;
      const hasGoldInTransition =
        existing[0].type === "GOLD" || nextType === "GOLD";

      const updateData: Partial<typeof assets.$inferInsert> = {
        updatedAt: new Date(),
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.type !== undefined && { type: parsed.data.type }),
        ...(!hasGoldInTransition &&
          parsed.data.balance !== undefined && {
          balance: parsed.data.balance.toString(),
        }),
        ...(!hasGoldInTransition &&
          parsed.data.goldGram !== undefined && {
          goldGram: parsed.data.goldGram.toFixed(6),
        }),
        ...(!hasGoldInTransition &&
          parsed.data.goldAvgBuyPrice !== undefined && {
          goldAvgBuyPrice: parsed.data.goldAvgBuyPrice.toFixed(2),
        }),
        ...(parsed.data.institution !== undefined && {
          institution: parsed.data.institution || null,
        }),
        ...(parsed.data.accountNumber !== undefined && {
          accountNumber: parsed.data.accountNumber || null,
        }),
        ...(parsed.data.interestRate !== undefined && {
          interestRate: parsed.data.interestRate?.toString() || null,
        }),
        ...(parsed.data.icon !== undefined && {
          icon: parsed.data.icon || null,
        }),
        ...(parsed.data.color !== undefined && {
          color: parsed.data.color || null,
        }),
        ...(parsed.data.isActive !== undefined && {
          isActive: parsed.data.isActive,
        }),
        ...(nextType === "GOLD" && {
          balance: "0",
          goldGram: "0.000000",
          goldAvgBuyPrice: "0.00",
        }),
      };

      const [result] = await db
        .update(assets)
        .set(updateData)
        .where(eq(assets.id, id))
        .returning();

      if (nextType === "GOLD") {
        try {
          await syncGoldAssetBalance(id, userId);
        } catch (syncError) {
          console.error("[assets] GOLD 잔액 동기화 실패", syncError);
        }
      }

      revalidatePath("/");

      return { success: true, data: result };
    } catch (error) {
      console.error("Error updating asset:", error);
      return { success: false, error: "자산 계좌 수정에 실패했습니다." };
    }
  });
}

/**
 * 자산 계좌 삭제
 */
export async function deleteAsset(id: number) {
  return withAuth(async (userId) => {
    try {
      // 존재 여부 확인
      const existing = await db
        .select()
        .from(assets)
        .where(and(eq(assets.id, id), eq(assets.userId, userId)))
        .limit(1);

      if (!existing[0]) {
        return { success: false, error: "자산 계좌가 존재하지 않습니다." };
      }

      // cascade 삭제로 관련 assetTransactions, fixedSavings도 삭제됨
      await db.delete(assets).where(eq(assets.id, id));

      revalidatePath("/");

      return { success: true };
    } catch (error) {
      console.error("Error deleting asset:", error);
      return { success: false, error: "자산 계좌 삭제에 실패했습니다." };
    }
  });
}

/**
 * 자산 계좌 활성/비활성 토글
 */
export async function toggleAssetActive(id: number) {
  return withAuth(async (userId) => {
    try {
      const existing = await db
        .select()
        .from(assets)
        .where(and(eq(assets.id, id), eq(assets.userId, userId)))
        .limit(1);

      if (!existing[0]) {
        return { success: false, error: "자산 계좌가 존재하지 않습니다." };
      }

      const [result] = await db
        .update(assets)
        .set({
          isActive: not(assets.isActive),
          updatedAt: new Date(),
        })
        .where(and(eq(assets.id, id), eq(assets.userId, userId)))
        .returning();

      revalidatePath("/");

      return { success: true, data: result };
    } catch (error) {
      console.error("Error toggling asset active:", error);
      return { success: false, error: "자산 계좌 상태 변경에 실패했습니다." };
    }
  });
}
