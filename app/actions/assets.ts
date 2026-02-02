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
      return { success: false, error: "Unauthorized" };
    }

    const parsed = assetSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: z.flattenError(parsed.error).fieldErrors };
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
      return [];
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

    return result;
  } catch (error) {
    console.error("Error fetching assets:", error);
    throw new Error("자산 계좌 조회에 실패했습니다.");
  }
}

/**
 * 자산 계좌 단건 조회
 */
export async function getAssetById(id: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
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

    return result[0] || null;
  } catch (error) {
    console.error("Error fetching asset:", error);
    return null;
  }
}

/**
 * 자산 계좌 수정
 */
export async function updateAsset(id: number, data: Partial<AssetInput>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
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
      return { success: false, error: z.flattenError(parsed.error).fieldErrors };
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
    if (parsed.data.balance !== undefined)
      updateData.balance = parsed.data.balance.toString();
    if (parsed.data.institution !== undefined)
      updateData.institution = parsed.data.institution || null;
    if (parsed.data.accountNumber !== undefined)
      updateData.accountNumber = parsed.data.accountNumber || null;
    if (parsed.data.interestRate !== undefined)
      updateData.interestRate = parsed.data.interestRate?.toString() || null;
    if (parsed.data.icon !== undefined)
      updateData.icon = parsed.data.icon || null;
    if (parsed.data.color !== undefined)
      updateData.color = parsed.data.color || null;
    if (parsed.data.isActive !== undefined)
      updateData.isActive = parsed.data.isActive;

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
      return { success: false, error: "Unauthorized" };
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
      return { success: false, error: "Unauthorized" };
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