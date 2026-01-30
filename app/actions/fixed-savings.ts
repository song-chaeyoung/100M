"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { fixedSavings, assets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  fixedSavingSchema,
  type FixedSavingInput,
} from "@/lib/validations/fixed-saving";

/**
 * 고정 저축 생성
 */
export async function createFixedSaving(data: FixedSavingInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Zod 검증
    const parsed = fixedSavingSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    // 자산 계좌가 본인 소유인지 확인
    const asset = await db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.id, parsed.data.assetId),
          eq(assets.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!asset[0]) {
      return { success: false, error: "Asset not found" };
    }

    const result = await db
      .insert(fixedSavings)
      .values({
        userId: session.user.id,
        title: parsed.data.title,
        amount: parsed.data.amount.toString(),
        scheduledDay: parsed.data.scheduledDay,
        assetId: parsed.data.assetId,
        isActive: true,
      })
      .returning();

    revalidatePath("/automation");

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Error creating fixed saving:", error);
    return { success: false, error: "Failed to create fixed saving" };
  }
}

/**
 * 고정 저축 목록 조회 (자산 계좌 정보 포함)
 */
export async function getFixedSavings() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    const result = await db
      .select({
        id: fixedSavings.id,
        userId: fixedSavings.userId,
        title: fixedSavings.title,
        amount: fixedSavings.amount,
        scheduledDay: fixedSavings.scheduledDay,
        assetId: fixedSavings.assetId,
        isActive: fixedSavings.isActive,
        lastGeneratedMonth: fixedSavings.lastGeneratedMonth,
        createdAt: fixedSavings.createdAt,
        updatedAt: fixedSavings.updatedAt,
        asset: {
          id: assets.id,
          name: assets.name,
          type: assets.type,
        },
      })
      .from(fixedSavings)
      .leftJoin(assets, eq(fixedSavings.assetId, assets.id))
      .where(eq(fixedSavings.userId, session.user.id))
      .orderBy(fixedSavings.scheduledDay);

    return result;
  } catch (error) {
    console.error("Error fetching fixed savings:", error);
    return [];
  }
}

/**
 * 고정 저축 단건 조회
 */
export async function getFixedSavingById(id: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

    const result = await db
      .select({
        id: fixedSavings.id,
        userId: fixedSavings.userId,
        title: fixedSavings.title,
        amount: fixedSavings.amount,
        scheduledDay: fixedSavings.scheduledDay,
        assetId: fixedSavings.assetId,
        isActive: fixedSavings.isActive,
        lastGeneratedMonth: fixedSavings.lastGeneratedMonth,
        createdAt: fixedSavings.createdAt,
        updatedAt: fixedSavings.updatedAt,
        asset: {
          id: assets.id,
          name: assets.name,
          type: assets.type,
        },
      })
      .from(fixedSavings)
      .leftJoin(assets, eq(fixedSavings.assetId, assets.id))
      .where(
        and(
          eq(fixedSavings.id, id),
          eq(fixedSavings.userId, session.user.id),
        ),
      )
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("Error fetching fixed saving:", error);
    return null;
  }
}

/**
 * 고정 저축 수정
 */
export async function updateFixedSaving(
  id: number,
  data: Partial<FixedSavingInput>,
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // 본인의 고정 저축인지 확인
    const existing = await db
      .select()
      .from(fixedSavings)
      .where(
        and(
          eq(fixedSavings.id, id),
          eq(fixedSavings.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      return { success: false, error: "Fixed saving not found" };
    }

    // 부분 검증 (partial)
    const parsed = fixedSavingSchema.partial().safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    // assetId가 변경되면 본인 소유인지 확인
    if (parsed.data.assetId !== undefined) {
      const asset = await db
        .select()
        .from(assets)
        .where(
          and(
            eq(assets.id, parsed.data.assetId),
            eq(assets.userId, session.user.id),
          ),
        )
        .limit(1);

      if (!asset[0]) {
        return { success: false, error: "Asset not found" };
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.amount !== undefined) updateData.amount = parsed.data.amount.toString();
    if (parsed.data.scheduledDay !== undefined) updateData.scheduledDay = parsed.data.scheduledDay;
    if (parsed.data.assetId !== undefined) updateData.assetId = parsed.data.assetId;

    const result = await db
      .update(fixedSavings)
      .set(updateData)
      .where(eq(fixedSavings.id, id))
      .returning();

    revalidatePath("/automation");

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Error updating fixed saving:", error);
    return { success: false, error: "Failed to update fixed saving" };
  }
}

/**
 * 고정 저축 삭제
 */
export async function deleteFixedSaving(id: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // 본인의 고정 저축인지 확인
    const existing = await db
      .select()
      .from(fixedSavings)
      .where(
        and(
          eq(fixedSavings.id, id),
          eq(fixedSavings.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      return { success: false, error: "Fixed saving not found" };
    }

    await db.delete(fixedSavings).where(eq(fixedSavings.id, id));

    revalidatePath("/automation");

    return { success: true };
  } catch (error) {
    console.error("Error deleting fixed saving:", error);
    return { success: false, error: "Failed to delete fixed saving" };
  }
}

/**
 * 고정 저축 활성/비활성 토글
 */
export async function toggleFixedSavingActive(id: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // 본인의 고정 저축인지 확인
    const existing = await db
      .select()
      .from(fixedSavings)
      .where(
        and(
          eq(fixedSavings.id, id),
          eq(fixedSavings.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      return { success: false, error: "Fixed saving not found" };
    }

    const result = await db
      .update(fixedSavings)
      .set({
        isActive: !existing[0].isActive,
        updatedAt: new Date(),
      })
      .where(eq(fixedSavings.id, id))
      .returning();

    revalidatePath("/automation");

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Error toggling fixed saving:", error);
    return { success: false, error: "Failed to toggle fixed saving" };
  }
}
