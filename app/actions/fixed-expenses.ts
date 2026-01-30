"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { fixedExpenses, categories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  fixedExpenseSchema,
  type FixedExpenseInput,
} from "@/lib/validations/fixed-expense";

/**
 * 고정 지출 생성
 */
export async function createFixedExpense(data: FixedExpenseInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Zod 검증
    const parsed = fixedExpenseSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    const result = await db
      .insert(fixedExpenses)
      .values({
        userId: session.user.id,
        title: parsed.data.title,
        amount: parsed.data.amount.toString(),
        scheduledDay: parsed.data.scheduledDay,
        type: parsed.data.type,
        categoryId: parsed.data.categoryId,
        method: parsed.data.method,
        isActive: true,
      })
      .returning();

    revalidatePath("/automation");

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Error creating fixed expense:", error);
    return { success: false, error: "Failed to create fixed expense" };
  }
}

/**
 * 고정 지출 목록 조회 (카테고리 정보 포함)
 */
export async function getFixedExpenses() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    const result = await db
      .select({
        id: fixedExpenses.id,
        userId: fixedExpenses.userId,
        title: fixedExpenses.title,
        amount: fixedExpenses.amount,
        scheduledDay: fixedExpenses.scheduledDay,
        type: fixedExpenses.type,
        categoryId: fixedExpenses.categoryId,
        method: fixedExpenses.method,
        isActive: fixedExpenses.isActive,
        lastGeneratedMonth: fixedExpenses.lastGeneratedMonth,
        createdAt: fixedExpenses.createdAt,
        updatedAt: fixedExpenses.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
          icon: categories.icon,
          type: categories.type,
        },
      })
      .from(fixedExpenses)
      .leftJoin(categories, eq(fixedExpenses.categoryId, categories.id))
      .where(eq(fixedExpenses.userId, session.user.id))
      .orderBy(fixedExpenses.scheduledDay);

    return result;
  } catch (error) {
    console.error("Error fetching fixed expenses:", error);
    return [];
  }
}

/**
 * 고정 지출 단건 조회
 */
export async function getFixedExpenseById(id: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

    const result = await db
      .select({
        id: fixedExpenses.id,
        userId: fixedExpenses.userId,
        title: fixedExpenses.title,
        amount: fixedExpenses.amount,
        scheduledDay: fixedExpenses.scheduledDay,
        type: fixedExpenses.type,
        categoryId: fixedExpenses.categoryId,
        method: fixedExpenses.method,
        isActive: fixedExpenses.isActive,
        lastGeneratedMonth: fixedExpenses.lastGeneratedMonth,
        createdAt: fixedExpenses.createdAt,
        updatedAt: fixedExpenses.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
          icon: categories.icon,
          type: categories.type,
        },
      })
      .from(fixedExpenses)
      .leftJoin(categories, eq(fixedExpenses.categoryId, categories.id))
      .where(
        and(
          eq(fixedExpenses.id, id),
          eq(fixedExpenses.userId, session.user.id),
        ),
      )
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("Error fetching fixed expense:", error);
    return null;
  }
}

/**
 * 고정 지출 수정
 */
export async function updateFixedExpense(
  id: number,
  data: Partial<FixedExpenseInput>,
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // 본인의 고정 지출인지 확인
    const existing = await db
      .select()
      .from(fixedExpenses)
      .where(
        and(
          eq(fixedExpenses.id, id),
          eq(fixedExpenses.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      return { success: false, error: "Fixed expense not found" };
    }

    // 부분 검증 (partial)
    const parsed = fixedExpenseSchema.partial().safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.amount !== undefined) updateData.amount = parsed.data.amount.toString();
    if (parsed.data.scheduledDay !== undefined) updateData.scheduledDay = parsed.data.scheduledDay;
    if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
    if (parsed.data.categoryId !== undefined) updateData.categoryId = parsed.data.categoryId;
    if (parsed.data.method !== undefined) updateData.method = parsed.data.method;

    const result = await db
      .update(fixedExpenses)
      .set(updateData)
      .where(eq(fixedExpenses.id, id))
      .returning();

    revalidatePath("/automation");

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Error updating fixed expense:", error);
    return { success: false, error: "Failed to update fixed expense" };
  }
}

/**
 * 고정 지출 삭제
 */
export async function deleteFixedExpense(id: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // 본인의 고정 지출인지 확인
    const existing = await db
      .select()
      .from(fixedExpenses)
      .where(
        and(
          eq(fixedExpenses.id, id),
          eq(fixedExpenses.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      return { success: false, error: "Fixed expense not found" };
    }

    await db.delete(fixedExpenses).where(eq(fixedExpenses.id, id));

    revalidatePath("/automation");

    return { success: true };
  } catch (error) {
    console.error("Error deleting fixed expense:", error);
    return { success: false, error: "Failed to delete fixed expense" };
  }
}

/**
 * 고정 지출 활성/비활성 토글
 */
export async function toggleFixedExpenseActive(id: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // 본인의 고정 지출인지 확인
    const existing = await db
      .select()
      .from(fixedExpenses)
      .where(
        and(
          eq(fixedExpenses.id, id),
          eq(fixedExpenses.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      return { success: false, error: "Fixed expense not found" };
    }

    const result = await db
      .update(fixedExpenses)
      .set({
        isActive: !existing[0].isActive,
        updatedAt: new Date(),
      })
      .where(eq(fixedExpenses.id, id))
      .returning();

    revalidatePath("/automation");

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Error toggling fixed expense:", error);
    return { success: false, error: "Failed to toggle fixed expense" };
  }
}
