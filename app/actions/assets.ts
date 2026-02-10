"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assetSchema, type AssetInput } from "@/lib/validations/asset";
import { z } from "zod";

/**
 * 자산 계좌 생성
 */
export async function createAsset(data: AssetInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
    }

    const parsed = assetSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: z.flattenError(parsed.error).fieldErrors,
      };
    }

    const [result] = await db
      .insert(assets)
      .values({
        userId: session.user.id,
        name: parsed.data.name,
        type: parsed.data.type,
        balance: parsed.data.balance.toString(),
        institution: parsed.data.institution || null,
        accountNumber: parsed.data.accountNumber || null,
        interestRate: parsed.data.interestRate?.toString() || null,
        icon: parsed.data.icon || null,
        color: parsed.data.color || null,
        isActive: parsed.data.isActive,
      })
      .returning();

    revalidatePath("/assets");
    revalidatePath("/");

    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating asset:", error);
    return { success: false, error: "자산 계좌 생성에 실패했습니다." };
  }
}

/**
 * 자산 계좌 목록 조회
 */
export async function getAssets() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
    }

    const result = await db
      .select({
        id: assets.id,
        name: assets.name,
        type: assets.type,
        balance: assets.balance,
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
      .where(eq(assets.userId, session.user.id))
      .orderBy(assets.name);

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching assets:", error);
    return { success: false, error: "자산 계좌 조회에 실패했습니다." };
  }
}

/**
 * 자산 계좌 단건 조회
 */
export async function getAssetById(id: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
    }

    const result = await db
      .select({
        id: assets.id,
        name: assets.name,
        type: assets.type,
        balance: assets.balance,
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
      .where(and(eq(assets.id, id), eq(assets.userId, session.user.id)))
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
}

/**
 * 자산 계좌 수정
 */
export async function updateAsset(id: number, data: Partial<AssetInput>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
    }

    // 존재 여부 확인
    const existing = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.userId, session.user.id)))
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

    const updateData: Partial<typeof assets.$inferInsert> = {
      updatedAt: new Date(),
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.type !== undefined && { type: parsed.data.type }),
      ...(parsed.data.balance !== undefined && {
        balance: parsed.data.balance.toString(),
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
    };

    const [result] = await db
      .update(assets)
      .set(updateData)
      .where(eq(assets.id, id))
      .returning();

    revalidatePath("/assets");
    revalidatePath("/");

    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating asset:", error);
    return { success: false, error: "자산 계좌 수정에 실패했습니다." };
  }
}

/**
 * 자산 계좌 삭제
 */
export async function deleteAsset(id: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
    }

    // 존재 여부 확인
    const existing = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.userId, session.user.id)))
      .limit(1);

    if (!existing[0]) {
      return { success: false, error: "자산 계좌가 존재하지 않습니다." };
    }

    // cascade 삭제로 관련 assetTransactions, fixedSavings도 삭제됨
    await db.delete(assets).where(eq(assets.id, id));

    revalidatePath("/assets");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error deleting asset:", error);
    return { success: false, error: "자산 계좌 삭제에 실패했습니다." };
  }
}

/**
 * 자산 계좌 활성/비활성 토글
 */
export async function toggleAssetActive(id: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
    }

    const existing = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.userId, session.user.id)))
      .limit(1);

    if (!existing[0]) {
      return { success: false, error: "자산 계좌가 존재하지 않습니다." };
    }

    const [result] = await db
      .update(assets)
      .set({
        isActive: !existing[0].isActive,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, id))
      .returning();

    revalidatePath("/assets");
    revalidatePath("/");

    return { success: true, data: result };
  } catch (error) {
    console.error("Error toggling asset active:", error);
    return { success: false, error: "자산 계좌 상태 변경에 실패했습니다." };
  }
}
