"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { eq } from "drizzle-orm";

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
      })
      .from(assets)
      .where(eq(assets.userId, session.user.id))
      .orderBy(assets.name);

    return result;
  } catch (error) {
    console.error("Error fetching assets:", error);
    return [];
  }
}
