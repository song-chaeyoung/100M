"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  assetTransactions,
  assets,
  type AssetTransactionType,
} from "@/db/schema";
import { eq, and, desc, lte } from "drizzle-orm";
import dayjs from "dayjs";
import { sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { revalidatePath } from "next/cache";
import {
  assetTransactionSchema,
  type AssetTransactionInput,
} from "@/lib/validations/asset-transaction";
import { z } from "zod";

/**
 * 거래 타입에 따른 잔액 연산 방향 결정
 */
function getBalanceOperation(type: AssetTransactionType): "add" | "subtract" {
  return type === "DEPOSIT" || type === "PROFIT" ? "add" : "subtract";
}

/**
 * 자산 잔액 업데이트
 */
export async function updateAssetBalance(
  assetId: number,
  amount: string,
  operation: "add" | "subtract",
) {
  await db
    .update(assets)
    .set({
      balance:
        operation === "add"
          ? sql`${assets.balance} + ${amount}`
          : sql`${assets.balance} - ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(assets.id, assetId));
}

/**
 * 자산 거래 생성
 */
export async function createAssetTransaction(data: AssetTransactionInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
    }

    const userId = session.user.id;

    const parsed = assetTransactionSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: z.flattenError(parsed.error).fieldErrors,
      };
    }

    // 자산 소유권 확인
    const asset = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, parsed.data.assetId), eq(assets.userId, userId)))
      .limit(1);

    if (!asset[0]) {
      return { success: false, error: "자산이 존재하지 않습니다." };
    }

    // TRANSFER인 경우 대상 자산 소유권도 확인
    if (parsed.data.type === "TRANSFER" && parsed.data.toAssetId) {
      const toAsset = await db
        .select()
        .from(assets)
        .where(
          and(eq(assets.id, parsed.data.toAssetId), eq(assets.userId, userId)),
        )
        .limit(1);

      if (!toAsset[0]) {
        return { success: false, error: "이체 대상 자산이 존재하지 않습니다." };
      }
    }

    const operation = getBalanceOperation(parsed.data.type);
    const amount = parsed.data.amount.toString();

    const insertQuery = db
      .insert(assetTransactions)
      .values({
        userId,
        assetId: parsed.data.assetId,
        type: parsed.data.type,
        amount,
        date: parsed.data.date,
        memo: parsed.data.memo || null,
        toAssetId: parsed.data.toAssetId || null,
        isFixed: false,
      })
      .returning();

    const fromBalanceQuery = db
      .update(assets)
      .set({
        balance:
          operation === "add"
            ? sql`${assets.balance} + ${amount}`
            : sql`${assets.balance} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, parsed.data.assetId));

    let result;
    if (parsed.data.type === "TRANSFER" && parsed.data.toAssetId) {
      const [[inserted]] = await db.batch([
        insertQuery,
        fromBalanceQuery,
        db
          .update(assets)
          .set({
            balance: sql`${assets.balance} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(eq(assets.id, parsed.data.toAssetId)),
      ]);
      result = inserted;
    } else {
      const [[inserted]] = await db.batch([insertQuery, fromBalanceQuery]);
      result = inserted;
    }

    revalidatePath("/assets");
    revalidatePath("/");

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "자산 거래 생성에 실패했습니다." };
  }
}

/**
 * 자산 거래 목록 조회
 */
export async function getAssetTransactions(assetId?: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
    }

    const today = dayjs().format("YYYY-MM-DD");
    const conditions = [
      eq(assetTransactions.userId, session.user.id),
      lte(assetTransactions.date, today),
    ];
    if (assetId) {
      conditions.push(eq(assetTransactions.assetId, assetId));
    }

    const result = await db
      .select({
        id: assetTransactions.id,
        assetId: assetTransactions.assetId,
        type: assetTransactions.type,
        amount: assetTransactions.amount,
        date: assetTransactions.date,
        memo: assetTransactions.memo,
        isFixed: assetTransactions.isFixed,
        fixedSavingId: assetTransactions.fixedSavingId,
        toAssetId: assetTransactions.toAssetId,
        createdAt: assetTransactions.createdAt,
        updatedAt: assetTransactions.updatedAt,
        asset: {
          id: assets.id,
          name: assets.name,
          type: assets.type,
          icon: assets.icon,
          color: assets.color,
        },
      })
      .from(assetTransactions)
      .leftJoin(assets, eq(assetTransactions.assetId, assets.id))
      .where(and(...conditions))
      .orderBy(desc(assetTransactions.date), desc(assetTransactions.createdAt));

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching asset transactions:", error);
    return { success: false, error: "자산 거래 목록 조회에 실패했습니다." };
  }
}

/**
 * 자산 거래 단건 조회
 */
export async function getAssetTransactionById(id: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
    }

    const result = await db
      .select({
        id: assetTransactions.id,
        assetId: assetTransactions.assetId,
        type: assetTransactions.type,
        amount: assetTransactions.amount,
        date: assetTransactions.date,
        memo: assetTransactions.memo,
        isFixed: assetTransactions.isFixed,
        fixedSavingId: assetTransactions.fixedSavingId,
        toAssetId: assetTransactions.toAssetId,
        createdAt: assetTransactions.createdAt,
        updatedAt: assetTransactions.updatedAt,
        asset: {
          id: assets.id,
          name: assets.name,
          type: assets.type,
          icon: assets.icon,
          color: assets.color,
        },
      })
      .from(assetTransactions)
      .leftJoin(assets, eq(assetTransactions.assetId, assets.id))
      .where(
        and(
          eq(assetTransactions.id, id),
          eq(assetTransactions.userId, session.user.id),
        ),
      )
      .limit(1);

    const transaction = result[0];
    if (!transaction) {
      return { success: false, error: "거래 내역을 찾을 수 없습니다." };
    }

    return { success: true, data: transaction };
  } catch (error) {
    console.error("Error fetching asset transaction:", error);
    return { success: false, error: "거래 내역 조회에 실패했습니다." };
  }
}

/**
 * 자산 거래 수정
 */
export async function updateAssetTransaction(
  id: number,
  data: Partial<AssetTransactionInput>,
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
    }

    const userId = session.user.id;

    // 기존 거래 조회
    const existing = await db
      .select()
      .from(assetTransactions)
      .where(
        and(eq(assetTransactions.id, id), eq(assetTransactions.userId, userId)),
      )
      .limit(1);

    if (!existing[0]) {
      return { success: false, error: "거래 내역이 존재하지 않습니다." };
    }

    // 고정 저축에서 생성된 거래는 수정 불가
    if (existing[0].isFixed) {
      return {
        success: false,
        error: "고정 저축에서 생성된 거래는 수정할 수 없습니다.",
      };
    }

    const parsed = assetTransactionSchema.partial().safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: z.flattenError(parsed.error).fieldErrors,
      };
    }

    // 거래 정보 업데이트 데이터 준비
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (parsed.data.assetId !== undefined)
      updateData.assetId = parsed.data.assetId;
    if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
    if (parsed.data.amount !== undefined)
      updateData.amount = parsed.data.amount.toString();
    if (parsed.data.date !== undefined) updateData.date = parsed.data.date;
    if (parsed.data.memo !== undefined)
      updateData.memo = parsed.data.memo || null;
    if (parsed.data.toAssetId !== undefined)
      updateData.toAssetId = parsed.data.toAssetId || null;

    const newAssetId = parsed.data.assetId ?? existing[0].assetId;
    const newType = parsed.data.type ?? existing[0].type;
    const newAmount = parsed.data.amount?.toString() ?? existing[0].amount;
    const newToAssetId = parsed.data.toAssetId ?? existing[0].toAssetId;

    const existingOp = getBalanceOperation(existing[0].type);
    const reverseOp = existingOp === "add" ? "subtract" : "add";
    const newOp = getBalanceOperation(newType);

    // batch 쿼리 구성: 역연산 → 거래 수정 → 새 적용
    const queries: BatchItem<"pg">[] = [
      // 1. 기존 잔액 역연산
      db
        .update(assets)
        .set({
          balance:
            reverseOp === "add"
              ? sql`${assets.balance} + ${existing[0].amount}`
              : sql`${assets.balance} - ${existing[0].amount}`,
          updatedAt: new Date(),
        })
        .where(eq(assets.id, existing[0].assetId)),
    ];

    if (existing[0].type === "TRANSFER" && existing[0].toAssetId) {
      queries.push(
        db
          .update(assets)
          .set({
            balance: sql`${assets.balance} - ${existing[0].amount}`,
            updatedAt: new Date(),
          })
          .where(eq(assets.id, existing[0].toAssetId)),
      );
    }

    // 2. 거래 수정 (RETURNING) - 인덱스 추적
    const returningIndex = queries.length;
    queries.push(
      db
        .update(assetTransactions)
        .set(updateData)
        .where(eq(assetTransactions.id, id))
        .returning(),
    );

    // 3. 새 잔액 적용
    queries.push(
      db
        .update(assets)
        .set({
          balance:
            newOp === "add"
              ? sql`${assets.balance} + ${newAmount}`
              : sql`${assets.balance} - ${newAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(assets.id, newAssetId)),
    );

    if (newType === "TRANSFER" && newToAssetId) {
      queries.push(
        db
          .update(assets)
          .set({
            balance: sql`${assets.balance} + ${newAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(assets.id, newToAssetId)),
      );
    }

    const results = await db.batch(
      queries as [BatchItem<"pg">, ...BatchItem<"pg">[]],
    );
    const updated = results[returningIndex][0];

    revalidatePath("/assets");
    revalidatePath("/");

    return { success: true, data: updated };
  } catch (error) {
    console.error("Error updating asset transaction:", error);
    return { success: false, error: "자산 거래 수정에 실패했습니다." };
  }
}

/**
 * 자산 거래 삭제
 */
export async function deleteAssetTransaction(id: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "인증이 필요합니다." };
    }

    // 기존 거래 조회
    const existing = await db
      .select()
      .from(assetTransactions)
      .where(
        and(
          eq(assetTransactions.id, id),
          eq(assetTransactions.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      return { success: false, error: "거래 내역이 존재하지 않습니다." };
    }

    // 고정 저축에서 생성된 거래는 삭제 불가
    if (existing[0].isFixed) {
      return {
        success: false,
        error: "고정 저축에서 생성된 거래는 삭제할 수 없습니다.",
      };
    }

    const existingOp = getBalanceOperation(existing[0].type);
    const reverseOp = existingOp === "add" ? "subtract" : "add";

    const reverseQuery = db
      .update(assets)
      .set({
        balance:
          reverseOp === "add"
            ? sql`${assets.balance} + ${existing[0].amount}`
            : sql`${assets.balance} - ${existing[0].amount}`,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, existing[0].assetId));

    const deleteQuery = db
      .delete(assetTransactions)
      .where(eq(assetTransactions.id, id));

    if (existing[0].type === "TRANSFER" && existing[0].toAssetId) {
      await db.batch([
        reverseQuery,
        db
          .update(assets)
          .set({
            balance: sql`${assets.balance} - ${existing[0].amount}`,
            updatedAt: new Date(),
          })
          .where(eq(assets.id, existing[0].toAssetId)),
        deleteQuery,
      ]);
    } else {
      await db.batch([reverseQuery, deleteQuery]);
    }

    revalidatePath("/assets");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error deleting asset transaction:", error);
    return { success: false, error: "자산 거래 삭제에 실패했습니다." };
  }
}
