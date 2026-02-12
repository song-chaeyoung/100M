"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { categories, type CategoryType } from "@/db/schema";
import { eq, or, isNull, and } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

export interface Category {
  id: number;
  name: string;
  icon: string;
  type: CategoryType;
  userId: string | null;
  order: number;
  isDefault: boolean;
}

/**
 * 카테고리 목록 조회 (내부 함수)
 */
async function getCategoriesInternal(
  userId: string,
  type?: CategoryType,
): Promise<Category[]> {
  const userCondition = or(
    eq(categories.userId, userId),
    isNull(categories.userId),
  );

  const whereCondition = type
    ? and(eq(categories.type, type), userCondition)
    : userCondition;

  const result = await db
    .select()
    .from(categories)
    .where(whereCondition)
    .orderBy(categories.order);

  return result as Category[];
}

/**
 * 카테고리 목록 조회 (사용자 카테고리 + 기본 카테고리)
 */
export async function getCategories(type?: CategoryType) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
    }

    const data = await getCachedCategories(session.user.id, type);
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return { success: false, error: "카테고리 조회에 실패했습니다." };
  }
}

async function getCachedCategories(userId: string, type?: CategoryType) {
  "use cache";
  cacheLife("weeks");
  cacheTag(`user-${userId}-categories`);

  return getCategoriesInternal(userId, type);
}
