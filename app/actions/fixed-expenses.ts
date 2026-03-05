"use server";

import { withAuth } from "@/lib/with-auth";
import { db } from "@/db";
import { fixedExpenses, categories, transactions } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  fixedExpenseSchema,
  type FixedExpenseInput,
} from "@/lib/validations/fixed-expense";
import { z } from "zod";
import { getMonthsBetween, toScheduledDate } from "@/lib/utils";
import dayjs from "dayjs";

async function ensureOwnedExpenseCategory(userId: string, categoryId: number) {
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.userId, userId),
        eq(categories.type, "EXPENSE"),
      ),
    )
    .limit(1);

  return !!category;
}

/**
 * 고정 지출 생성 (+ 예정 거래 자동 생성)
 */
export async function createFixedExpense(data: FixedExpenseInput) {
  return withAuth(async (userId) => {
    try {
      const parsed = fixedExpenseSchema.safeParse(data);
      if (!parsed.success) {
        return {
          success: false,
          error: z.flattenError(parsed.error).fieldErrors,
        };
      }

      if (!(await ensureOwnedExpenseCategory(userId, parsed.data.categoryId))) {
        return { success: false, error: "유효하지 않은 카테고리입니다." };
      }

      // 1. 고정 지출 생성
      const [fixedExpense] = await db
        .insert(fixedExpenses)
        .values({
          userId,
          title: parsed.data.title,
          amount: parsed.data.amount.toString(),
          scheduledDay: parsed.data.scheduledDay,
          type: parsed.data.type,
          categoryId: parsed.data.categoryId,
          method: parsed.data.method,
          startDate: `${parsed.data.startDate}-01`,
          endDate: `${parsed.data.endDate}-01`,
          isActive: true,
        })
        .returning();

      // 2. 기간 내 예정 거래 생성
      const months = getMonthsBetween(
        parsed.data.startDate,
        parsed.data.endDate,
      );
      const transactionsToInsert = months.map((month) => ({
        userId,
        type: "EXPENSE" as const,
        amount: parsed.data.amount.toString(),
        date: toScheduledDate(month, parsed.data.scheduledDay),
        categoryId: parsed.data.categoryId,
        method: parsed.data.method,
        memo: parsed.data.title,
        isFixed: true,
        fixedExpenseId: fixedExpense.id,
      }));

      if (transactionsToInsert.length > 0) {
        await db
          .insert(transactions)
          .values(transactionsToInsert)
          .onConflictDoNothing();
      }

      const result = fixedExpense;

      revalidatePath("/");

      return { success: true, data: result };
    } catch (error) {
      console.error("Error creating fixed expense:", error);
      return { success: false, error: "고정 지출 생성에 실패했습니다." };
    }
  });
}

/**
 * 고정 지출 목록 조회 (카테고리 정보 포함)
 */
export async function getFixedExpenses() {
  return withAuth(async (userId) => {
    try {
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
          startDate: fixedExpenses.startDate,
          endDate: fixedExpenses.endDate,
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
        .where(eq(fixedExpenses.userId, userId))
        .orderBy(fixedExpenses.scheduledDay);

      return { success: true, data: result };
    } catch (error) {
      console.error("Error fetching fixed expenses:", error);
      return { success: false, error: "고정 지출 조회에 실패했습니다." };
    }
  });
}

/**
 * 고정 지출 단건 조회
 */
export async function getFixedExpenseById(id: number) {
  return withAuth(async (userId) => {
    try {
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
          startDate: fixedExpenses.startDate,
          endDate: fixedExpenses.endDate,
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
        .where(and(eq(fixedExpenses.id, id), eq(fixedExpenses.userId, userId)))
        .limit(1);

      return { success: true, data: result[0] || null };
    } catch (error) {
      console.error("Error fetching fixed expense:", error);
      return { success: false, error: "고정 지출 조회에 실패했습니다." };
    }
  });
}

/**
 * 고정 지출 수정 (+ 미확정 거래 재생성)
 */
export async function updateFixedExpense(
  id: number,
  data: Partial<FixedExpenseInput>,
) {
  return withAuth(async (userId) => {
    try {
      const existing = await db
        .select()
        .from(fixedExpenses)
        .where(and(eq(fixedExpenses.id, id), eq(fixedExpenses.userId, userId)))
        .limit(1);

      if (!existing[0]) {
        return { success: false, error: "고정 지출을 찾을 수 없습니다." };
      }

      const parsed = fixedExpenseSchema.partial().safeParse(data);
      if (!parsed.success) {
        return {
          success: false,
          error: z.flattenError(parsed.error).fieldErrors,
        };
      }

      if (
        parsed.data.categoryId !== undefined &&
        !(await ensureOwnedExpenseCategory(userId, parsed.data.categoryId))
      ) {
        return { success: false, error: "유효하지 않은 카테고리입니다." };
      }

      // 1. 미래 날짜의 고정 지출 거래 삭제 (오늘 이후)
      const today = dayjs().format("YYYY-MM-DD");
      await db
        .delete(transactions)
        .where(
          and(
            eq(transactions.fixedExpenseId, id),
            gte(transactions.date, today),
          ),
        );

      // 2. 고정 지출 업데이트
      const updateData: Partial<typeof fixedExpenses.$inferInsert> = {
        updatedAt: new Date(),
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.amount !== undefined && {
          amount: parsed.data.amount.toString(),
        }),
        ...(parsed.data.scheduledDay !== undefined && {
          scheduledDay: parsed.data.scheduledDay,
        }),
        ...(parsed.data.type !== undefined && { type: parsed.data.type }),
        ...(parsed.data.categoryId !== undefined && {
          categoryId: parsed.data.categoryId,
        }),
        ...(parsed.data.method !== undefined && {
          method: parsed.data.method,
        }),
        ...(parsed.data.startDate !== undefined && {
          startDate: `${parsed.data.startDate}-01`,
        }),
        ...(parsed.data.endDate !== undefined && {
          endDate: `${parsed.data.endDate}-01`,
        }),
      };

      const [updated] = await db
        .update(fixedExpenses)
        .set(updateData)
        .where(and(eq(fixedExpenses.id, id), eq(fixedExpenses.userId, userId)))
        .returning();

      if (!updated) {
        return {
          success: false,
          error: "고정 지출을 찾을 수 없거나 권한이 없습니다.",
        };
      }

      // 3. 새 조건으로 예정 거래 재생성 (활성 상태일 때만, 오늘 이후만)
      if (updated.isActive) {
        const startMonth =
          parsed.data.startDate || existing[0].startDate?.slice(0, 7);
        const endMonth =
          parsed.data.endDate || existing[0].endDate?.slice(0, 7);

        if (startMonth && endMonth) {
          const scheduledDay =
            parsed.data.scheduledDay ?? existing[0].scheduledDay;
          const amount = parsed.data.amount?.toString() ?? existing[0].amount;
          const categoryId = parsed.data.categoryId ?? existing[0].categoryId;
          const method = parsed.data.method ?? existing[0].method;
          const title = parsed.data.title ?? existing[0].title;

          // 오늘 이후 날짜의 월만 필터링
          const months = getMonthsBetween(startMonth, endMonth).filter(
            (month) => {
              const date = toScheduledDate(month, scheduledDay);
              return date >= today;
            },
          );

          const transactionsToInsert = months.map((month) => ({
            userId,
            type: "EXPENSE" as const,
            amount,
            date: toScheduledDate(month, scheduledDay),
            categoryId,
            method,
            memo: title,
            isFixed: true,
            fixedExpenseId: id,
          }));

          if (transactionsToInsert.length > 0) {
            await db
              .insert(transactions)
              .values(transactionsToInsert)
              .onConflictDoNothing();
          }
        }
      }

      const result = updated;

      revalidatePath("/");

      return { success: true, data: result };
    } catch (error) {
      console.error("Error updating fixed expense:", error);
      return { success: false, error: "고정 지출 수정에 실패했습니다." };
    }
  });
}

/**
 * 고정 지출 삭제 (+ 미확정 거래도 삭제)
 */
export async function deleteFixedExpense(id: number) {
  return withAuth(async (userId) => {
    try {
      const existing = await db
        .select()
        .from(fixedExpenses)
        .where(and(eq(fixedExpenses.id, id), eq(fixedExpenses.userId, userId)))
        .limit(1);

      if (!existing[0]) {
        return { success: false, error: "고정 지출이 존재하지 않습니다." };
      }

      // 1. 미래 날짜의 고정 지출 거래 삭제
      const today = dayjs().format("YYYY-MM-DD");
      await db
        .delete(transactions)
        .where(
          and(
            eq(transactions.fixedExpenseId, id),
            gte(transactions.date, today),
          ),
        );

      // 2. 고정 지출 삭제
      const [deleted] = await db
        .delete(fixedExpenses)
        .where(and(eq(fixedExpenses.id, id), eq(fixedExpenses.userId, userId)))
        .returning();

      if (!deleted) {
        return {
          success: false,
          error: "고정 지출을 찾을 수 없거나 권한이 없습니다.",
        };
      }

      revalidatePath("/");

      return { success: true };
    } catch (error) {
      console.error("Error deleting fixed expense:", error);
      return { success: false, error: "고정 지출 삭제에 실패했습니다." };
    }
  });
}

/**
 * 고정 지출 활성/비활성 토글 (+ 비활성화 시 미확정 거래 삭제)
 *
 * CAS(Compare-And-Swap) 패턴 적용:
 * 1. UPDATE를 먼저 실행하고, WHERE 조건에 현재 isActive 값을 포함시켜
 *    상태가 바뀌지 않은 경우에만 업데이트가 성공하도록 한다.
 * 2. UPDATE가 0건이면 다른 요청이 먼저 처리한 것이므로 즉시 반환한다.
 * 3. UPDATE에 성공한 요청만 부수효과(거래 삭제/재생성)를 실행한다.
 */
export async function toggleFixedExpenseActive(id: number) {
  return withAuth(async (userId) => {
    try {
      const existing = await db
        .select()
        .from(fixedExpenses)
        .where(and(eq(fixedExpenses.id, id), eq(fixedExpenses.userId, userId)))
        .limit(1);

      if (!existing[0]) {
        return { success: false, error: "고정 지출을 찾을 수 없습니다." };
      }

      const currentIsActive = existing[0].isActive;
      const newIsActive = !currentIsActive;

      // ── CAS UPDATE ─────────────────────────────────────────────────────────
      // WHERE 절에 eq(fixedExpenses.isActive, currentIsActive)를 추가해
      // 읽은 시점과 상태가 동일할 때만 업데이트가 성공한다.
      // 동시 요청 중 하나만 성공하고, 나머지는 0건 반환(result = undefined).
      const [result] = await db
        .update(fixedExpenses)
        .set({
          isActive: newIsActive,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(fixedExpenses.id, id),
            eq(fixedExpenses.userId, userId),
            eq(fixedExpenses.isActive, currentIsActive), // CAS 조건
          ),
        )
        .returning();

      if (!result) {
        // 다른 요청이 이미 상태를 변경했거나, 레코드가 없는 경우
        return {
          success: false,
          error: "상태가 이미 변경되었습니다. 페이지를 새로고침해 주세요.",
        };
      }
      // ───────────────────────────────────────────────────────────────────────

      // UPDATE에 성공한 요청만 부수효과를 실행한다 (정확히 한 번 보장)
      if (!newIsActive) {
        // 비활성화 시 미래 날짜의 거래 삭제
        const today = dayjs().format("YYYY-MM-DD");
        await db
          .delete(transactions)
          .where(
            and(
              eq(transactions.fixedExpenseId, id),
              gte(transactions.date, today),
            ),
          );
      } else {
        // 활성화 시 예정 거래 재생성 (오늘 이후만)
        const today = dayjs().format("YYYY-MM-DD");
        const startMonth = existing[0].startDate?.slice(0, 7);
        const endMonth = existing[0].endDate?.slice(0, 7);

        if (startMonth && endMonth) {
          const scheduledDay = existing[0].scheduledDay;

          // 오늘 이후 날짜의 월만 필터링
          const months = getMonthsBetween(startMonth, endMonth).filter(
            (month) => {
              const date = toScheduledDate(month, scheduledDay);
              return date >= today;
            },
          );

          const transactionsToInsert = months.map((month) => ({
            userId,
            type: "EXPENSE" as const,
            amount: existing[0].amount,
            date: toScheduledDate(month, scheduledDay),
            categoryId: existing[0].categoryId,
            method: existing[0].method,
            memo: existing[0].title,
            isFixed: true,
            fixedExpenseId: id,
          }));

          if (transactionsToInsert.length > 0) {
            await db
              .insert(transactions)
              .values(transactionsToInsert)
              .onConflictDoNothing();
          }
        }
      }

      revalidatePath("/");

      return { success: true, data: result };
    } catch (error) {
      console.error("Error toggling fixed expense:", error);
      return {
        success: false,
        error: "고정 지출 활성화/비활성화에 실패했습니다.",
      };
    }
  });
}
