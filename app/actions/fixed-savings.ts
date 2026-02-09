"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  fixedSavings,
  assets,
  assetTransactions,
  transactions,
} from "@/db/schema";
import { eq, and, gte, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  fixedSavingSchema,
  type FixedSavingInput,
} from "@/lib/validations/fixed-saving";
import { z } from "zod";
import { getMonthsBetween } from "@/lib/utils";
import dayjs from "dayjs";

/**
 * 고정 저축 생성 (+ 예정 거래 자동 생성)
 */
export async function createFixedSaving(data: FixedSavingInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    const parsed = fixedSavingSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: z.flattenError(parsed.error).fieldErrors,
      };
    }

    // 자산 계좌가 본인 소유인지 확인
    const asset = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, parsed.data.assetId), eq(assets.userId, userId)))
      .limit(1);

    if (!asset[0]) {
      return { success: false, error: "Asset not found" };
    }

    // 1. 고정 저축 생성
    const [fixedSaving] = await db
      .insert(fixedSavings)
      .values({
        userId,
        title: parsed.data.title,
        amount: parsed.data.amount.toString(),
        scheduledDay: parsed.data.scheduledDay,
        assetId: parsed.data.assetId,
        startDate: `${parsed.data.startDate}-01`,
        endDate: `${parsed.data.endDate}-01`,
        isActive: true,
      })
      .returning();

    // 2. 기간 내 예정 거래 벌크 생성
    const months = getMonthsBetween(parsed.data.startDate, parsed.data.endDate);
    const today = dayjs().format("YYYY-MM-DD");
    const amount = parsed.data.amount.toString();

    const dates = months.map(
      (month) =>
        `${month}-${String(parsed.data.scheduledDay).padStart(2, "0")}`,
    );

    if (dates.length > 0) {
      // 1) 자산거래 전체 한번에 insert
      const assetTxResults = await db
        .insert(assetTransactions)
        .values(
          dates.map((date) => ({
            userId,
            assetId: parsed.data.assetId,
            type: "DEPOSIT" as const,
            amount,
            date,
            memo: parsed.data.title,
            isFixed: true,
            fixedSavingId: fixedSaving.id,
          })),
        )
        .returning();

      // 2) 반환된 ID로 일반거래(SAVING) 전체 한번에 insert
      await db.insert(transactions).values(
        assetTxResults.map((atx) => ({
          userId,
          type: "SAVING" as const,
          amount,
          date: atx.date,
          memo: parsed.data.title,
          isFixed: true,
          linkedAssetTransactionId: atx.id,
        })),
      );

      // 3) 잔액 업데이트: 과거/오늘 날짜 건수만큼 한번에
      const pastCount = dates.filter((date) => date <= today).length;
      if (pastCount > 0) {
        await db
          .update(assets)
          .set({
            balance: sql`${assets.balance} + ${amount}::numeric * ${pastCount}`,
            updatedAt: new Date(),
          })
          .where(eq(assets.id, parsed.data.assetId));
      }
    }

    revalidatePath("/automation");
    revalidatePath("/assets");
    revalidatePath("/");

    return { success: true, data: fixedSaving };
  } catch (error) {
    console.error("Error creating fixed saving:", error);
    return { success: false, error: "고정 저축 생성에 실패했습니다." };
  }
}

/**
 * 고정 저축 목록 조회 (자산 계좌 정보 포함)
 */
export async function getFixedSavings() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
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
        startDate: fixedSavings.startDate,
        endDate: fixedSavings.endDate,
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

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching fixed savings:", error);
    return { success: false, error: "고정 저축 조회에 실패했습니다." };
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
        startDate: fixedSavings.startDate,
        endDate: fixedSavings.endDate,
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
        and(eq(fixedSavings.id, id), eq(fixedSavings.userId, session.user.id)),
      )
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("Error fetching fixed saving:", error);
    return { success: false, error: "고정 저축 조회에 실패했습니다." };
  }
}

/**
 * 고정 저축 수정 (+ 미확정 거래 재생성)
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

    const userId = session.user.id;

    const existing = await db
      .select()
      .from(fixedSavings)
      .where(and(eq(fixedSavings.id, id), eq(fixedSavings.userId, userId)))
      .limit(1);

    if (!existing[0]) {
      return { success: false, error: "Fixed saving not found" };
    }

    const parsed = fixedSavingSchema.partial().safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: z.flattenError(parsed.error).fieldErrors,
      };
    }

    // assetId가 변경되면 본인 소유인지 확인
    if (parsed.data.assetId !== undefined) {
      const asset = await db
        .select()
        .from(assets)
        .where(
          and(eq(assets.id, parsed.data.assetId), eq(assets.userId, userId)),
        )
        .limit(1);

      if (!asset[0]) {
        return { success: false, error: "자산 계좌가 본인 소유가 아닙니다." };
      }
    }

    const today = dayjs().format("YYYY-MM-DD");

    // 1. 미래 날짜의 자산거래 삭제 (연결된 transactions도 삭제)
    const assetTxToDelete = await db
      .select({ id: assetTransactions.id })
      .from(assetTransactions)
      .where(
        and(
          eq(assetTransactions.fixedSavingId, id),
          gte(assetTransactions.date, today),
        ),
      );

    const deleteIds = assetTxToDelete.map((atx) => atx.id);
    if (deleteIds.length > 0) {
      await db
        .delete(transactions)
        .where(inArray(transactions.linkedAssetTransactionId, deleteIds));
      await db
        .delete(assetTransactions)
        .where(inArray(assetTransactions.id, deleteIds));
    }

    // 2. 고정 저축 업데이트
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.amount !== undefined)
      updateData.amount = parsed.data.amount.toString();
    if (parsed.data.scheduledDay !== undefined)
      updateData.scheduledDay = parsed.data.scheduledDay;
    if (parsed.data.assetId !== undefined)
      updateData.assetId = parsed.data.assetId;
    if (parsed.data.startDate !== undefined)
      updateData.startDate = `${parsed.data.startDate}-01`;
    if (parsed.data.endDate !== undefined)
      updateData.endDate = `${parsed.data.endDate}-01`;

    const [updated] = await db
      .update(fixedSavings)
      .set(updateData)
      .where(eq(fixedSavings.id, id))
      .returning();

    // 3. 새 조건으로 예정 거래 재생성 (활성 상태일 때만, 오늘 이후만)
    if (updated.isActive) {
      const startMonth =
        parsed.data.startDate || existing[0].startDate?.slice(0, 7);
      const endMonth = parsed.data.endDate || existing[0].endDate?.slice(0, 7);

      if (startMonth && endMonth) {
        const scheduledDay =
          parsed.data.scheduledDay ?? existing[0].scheduledDay;
        const amount = parsed.data.amount?.toString() ?? existing[0].amount;
        const assetId = parsed.data.assetId ?? existing[0].assetId;
        const title = parsed.data.title ?? existing[0].title;

        // 오늘 이후 날짜의 월만 필터링
        const months = getMonthsBetween(startMonth, endMonth).filter((month) => {
          const date = `${month}-${String(scheduledDay).padStart(2, "0")}`;
          return date >= today;
        });

        const dates = months.map(
          (month) =>
            `${month}-${String(scheduledDay).padStart(2, "0")}`,
        );

        if (dates.length > 0) {
          // 자산거래 전체 한번에 insert
          const assetTxResults = await db
            .insert(assetTransactions)
            .values(
              dates.map((date) => ({
                userId,
                assetId,
                type: "DEPOSIT" as const,
                amount,
                date,
                memo: title,
                isFixed: true,
                fixedSavingId: id,
              })),
            )
            .returning();

          // 일반거래(SAVING) 전체 한번에 insert
          await db.insert(transactions).values(
            assetTxResults.map((atx) => ({
              userId,
              type: "SAVING" as const,
              amount,
              date: atx.date,
              memo: title,
              isFixed: true,
              linkedAssetTransactionId: atx.id,
            })),
          );

          // 잔액 업데이트: 과거/오늘 날짜 건수만큼 한번에
          const pastCount = dates.filter((date) => date <= today).length;
          if (pastCount > 0) {
            await db
              .update(assets)
              .set({
                balance: sql`${assets.balance} + ${amount}::numeric * ${pastCount}`,
                updatedAt: new Date(),
              })
              .where(eq(assets.id, assetId));
          }
        }
      }
    }

    revalidatePath("/automation");
    revalidatePath("/assets");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (error) {
    console.error("Error updating fixed saving:", error);
    return { success: false, error: "고정 저축 수정에 실패했습니다." };
  }
}

/**
 * 고정 저축 삭제 (+ 미확정 거래도 삭제)
 */
export async function deleteFixedSaving(id: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const existing = await db
      .select()
      .from(fixedSavings)
      .where(
        and(eq(fixedSavings.id, id), eq(fixedSavings.userId, session.user.id)),
      )
      .limit(1);

    if (!existing[0]) {
      return { success: false, error: "고정 저축이 존재하지 않습니다." };
    }

    // 1. 미래 날짜의 자산거래와 연결된 transactions 삭제
    const today = dayjs().format("YYYY-MM-DD");
    const assetTxToDelete = await db
      .select({ id: assetTransactions.id })
      .from(assetTransactions)
      .where(
        and(
          eq(assetTransactions.fixedSavingId, id),
          gte(assetTransactions.date, today),
        ),
      );

    const deleteIds = assetTxToDelete.map((atx) => atx.id);
    if (deleteIds.length > 0) {
      await db
        .delete(transactions)
        .where(inArray(transactions.linkedAssetTransactionId, deleteIds));
      await db
        .delete(assetTransactions)
        .where(inArray(assetTransactions.id, deleteIds));
    }

    // 2. 고정 저축 삭제
    await db.delete(fixedSavings).where(eq(fixedSavings.id, id));

    revalidatePath("/automation");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error deleting fixed saving:", error);
    return { success: false, error: "고정 저축 삭제에 실패했습니다." };
  }
}

/**
 * 고정 저축 활성/비활성 토글 (+ 비활성화 시 미확정 거래 삭제)
 */
export async function toggleFixedSavingActive(id: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    const existing = await db
      .select()
      .from(fixedSavings)
      .where(and(eq(fixedSavings.id, id), eq(fixedSavings.userId, userId)))
      .limit(1);

    if (!existing[0]) {
      return { success: false, error: "Fixed saving not found" };
    }

    const newIsActive = !existing[0].isActive;
    const today = dayjs().format("YYYY-MM-DD");

    if (!newIsActive) {
      // 비활성화 시 미래 날짜의 거래 삭제
      const assetTxToDelete = await db
        .select({ id: assetTransactions.id })
        .from(assetTransactions)
        .where(
          and(
            eq(assetTransactions.fixedSavingId, id),
            gte(assetTransactions.date, today),
          ),
        );

      const deleteIds = assetTxToDelete.map((atx) => atx.id);
      if (deleteIds.length > 0) {
        await db
          .delete(transactions)
          .where(inArray(transactions.linkedAssetTransactionId, deleteIds));
        await db
          .delete(assetTransactions)
          .where(inArray(assetTransactions.id, deleteIds));
      }
    } else {
      // 활성화 시 예정 거래 재생성 (오늘 이후만)
      const startMonth = existing[0].startDate?.slice(0, 7);
      const endMonth = existing[0].endDate?.slice(0, 7);

      if (startMonth && endMonth) {
        const scheduledDay = existing[0].scheduledDay;

        // 오늘 이후 날짜의 월만 필터링
        const months = getMonthsBetween(startMonth, endMonth).filter((month) => {
          const date = `${month}-${String(scheduledDay).padStart(2, "0")}`;
          return date >= today;
        });

        const dates = months.map(
          (month) =>
            `${month}-${String(scheduledDay).padStart(2, "0")}`,
        );

        if (dates.length > 0) {
          // 자산거래 전체 한번에 insert
          const assetTxResults = await db
            .insert(assetTransactions)
            .values(
              dates.map((date) => ({
                userId,
                assetId: existing[0].assetId,
                type: "DEPOSIT" as const,
                amount: existing[0].amount,
                date,
                memo: existing[0].title,
                isFixed: true,
                fixedSavingId: id,
              })),
            )
            .returning();

          // 일반거래(SAVING) 전체 한번에 insert
          await db.insert(transactions).values(
            assetTxResults.map((atx) => ({
              userId,
              type: "SAVING" as const,
              amount: existing[0].amount,
              date: atx.date,
              memo: existing[0].title,
              isFixed: true,
              linkedAssetTransactionId: atx.id,
            })),
          );

          // 잔액 업데이트: 과거/오늘 날짜 건수만큼 한번에
          const pastCount = dates.filter((date) => date <= today).length;
          if (pastCount > 0) {
            await db
              .update(assets)
              .set({
                balance: sql`${assets.balance} + ${existing[0].amount}::numeric * ${pastCount}`,
                updatedAt: new Date(),
              })
              .where(eq(assets.id, existing[0].assetId));
          }
        }
      }
    }

    const [result] = await db
      .update(fixedSavings)
      .set({
        isActive: newIsActive,
        updatedAt: new Date(),
      })
      .where(eq(fixedSavings.id, id))
      .returning();

    revalidatePath("/automation");
    revalidatePath("/assets");
    revalidatePath("/");

    return { success: true, data: result };
  } catch (error) {
    console.error("Error toggling fixed saving:", error);
    return {
      success: false,
      error: "고정 저축 활성화/비활성화에 실패했습니다.",
    };
  }
}
