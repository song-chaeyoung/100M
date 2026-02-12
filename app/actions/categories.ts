"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { categories, type CategoryType } from "@/db/schema";
import { eq, or, isNull, and } from "drizzle-orm";
import { unstable_cache } from "next/cache";

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
 * Next.js unstable_cache로 캐싱
 */
export async function getCategories(type?: CategoryType) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
    }

    const userId = session.user.id;

    const cacheKey = type ? `categories-${type}` : "categories-all";

    const getCachedCategories = unstable_cache(
      async () => getCategoriesInternal(userId, type),
      [cacheKey, userId],
      {
        tags: [`user-${userId}-categories`],
        revalidate: 10800, // 3시간 캐시
      },
    );

    const data = await getCachedCategories();
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return { success: false, error: "카테고리 조회에 실패했습니다." };
  }
}
