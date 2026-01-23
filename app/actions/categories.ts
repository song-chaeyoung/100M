"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq, or, isNull, and } from "drizzle-orm";
import { unstable_cache } from "next/cache";

export interface Category {
  id: number;
  name: string;
  icon: string;
  type: "INCOME" | "EXPENSE";
  userId: string | null;
  order: number;
  isDefault: boolean;
}

/**
 * 카테고리 목록 조회 (내부 함수)
 */
async function getCategoriesInternal(
  userId: string,
  type?: "INCOME" | "EXPENSE",
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
export async function getCategories(
  type?: "INCOME" | "EXPENSE",
): Promise<Category[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
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

  return getCachedCategories();
}
