"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { goalAmountSchema } from "@/lib/validations/goal";

export interface GoalData {
  id: number;
  targetAmount: number;
  initialAmount: number;
}

/**
 * 활성 목표 조회
 */
export async function getGoal() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
    }

    const [activeGoal] = await db
      .select({
        id: goals.id,
        targetAmount: goals.targetAmount,
        initialAmount: goals.initialAmount,
      })
      .from(goals)
      .where(and(eq(goals.userId, session.user.id), eq(goals.isActive, true)))
      .limit(1);

    if (!activeGoal) {
      return { success: false, error: "활성 목표를 찾을 수 없습니다." };
    }

    const data: GoalData = {
      id: activeGoal.id,
      targetAmount: Number(activeGoal.targetAmount),
      initialAmount: Number(activeGoal.initialAmount),
    };

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching goal:", error);
    return { success: false, error: "목표 조회에 실패했습니다." };
  }
}

/**
 * 목표 금액 수정
 */
export async function updateTargetAmount(
  goalId: number,
  targetAmount: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = goalAmountSchema.safeParse(targetAmount);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "로그인이 필요합니다." };
    }

    const [updated] = await db
      .update(goals)
      .set({
        targetAmount: String(targetAmount),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(goals.id, goalId),
          eq(goals.userId, session.user.id),
          eq(goals.isActive, true),
        ),
      )
      .returning({ id: goals.id });

    if (!updated) {
      return { success: false, error: "목표를 찾을 수 없습니다." };
    }

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error updating target amount:", error);
    return { success: false, error: "목표 금액 수정에 실패했습니다." };
  }
}

/**
 * 초기 자금 수정
 */
export async function updateInitialAmount(
  goalId: number,
  initialAmount: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = goalAmountSchema.safeParse(initialAmount);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "로그인이 필요합니다." };
    }

    const [updated] = await db
      .update(goals)
      .set({
        initialAmount: String(initialAmount),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(goals.id, goalId),
          eq(goals.userId, session.user.id),
          eq(goals.isActive, true),
        ),
      )
      .returning({ id: goals.id });

    if (!updated) {
      return { success: false, error: "목표를 찾을 수 없습니다." };
    }

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error updating initial amount:", error);
    return { success: false, error: "초기 자금 수정에 실패했습니다." };
  }
}
