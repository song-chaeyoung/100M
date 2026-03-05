"use server";

import { withAuth } from "@/lib/with-auth";
import { db } from "@/db";
import { assetTransactions, assets } from "@/db/schema";
import { eq, and, desc, lte, or, inArray } from "drizzle-orm";
import dayjs from "dayjs";
import { sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { revalidatePath } from "next/cache";
import {
  assetTransactionSchema,
  assetTransactionUpdateSchema,
  type AssetTransactionInput,
} from "@/lib/validations/asset-transaction";
import { z } from "zod";
import { getBalanceOperation } from "@/lib/utils/asset-transaction";
import { syncAssetBalance as syncStockBalance } from "./stocks";

/**
 * syncStockBalance를 안전하게 호출하는 헬퍼 팩토리.
 * 핵심 DB 쓰기가 이미 커밋된 뒤 sync 실패로 success:false가 되는 것을 방지.
 * 실패 시 에러 로그만 남기고 warnings 배열에 수집한다.
 */
function makeSafeSync(userId: string, warnings: string[]) {
  return async (assetId: number) => {
    try {
      await syncStockBalance(assetId, userId);
    } catch (e) {
      console.error("[safeSync] Stock balance sync failed", { assetId, e });
      warnings.push(`assetId=${assetId} 잔액 동기화 실패 (재시도 필요)`);
    }
  };
}

/**
 * 자산 거래 생성
 */
export async function createAssetTransaction(data: AssetTransactionInput) {
  return withAuth(async (userId) => {
    try {
      const parsed = assetTransactionSchema.safeParse(data);
      if (!parsed.success) {
        return {
          success: false,
          error: z.flattenError(parsed.error).fieldErrors,
        };
      }

      // 자산 소유권 확인 (type 포함 조회로 후속 쿼리 절약)
      const asset = await db
        .select({ id: assets.id, type: assets.type })
        .from(assets)
        .where(
          and(eq(assets.id, parsed.data.assetId), eq(assets.userId, userId)),
        )
        .limit(1);

      if (!asset[0]) {
        return { success: false, error: "자산이 존재하지 않습니다." };
      }

      // TRANSFER인 경우 대상 자산 소유권도 확인 (type 포함)
      let toAsset: { id: number; type: string } | undefined;
      if (parsed.data.type === "TRANSFER" && parsed.data.toAssetId) {
        const [found] = await db
          .select({ id: assets.id, type: assets.type })
          .from(assets)
          .where(
            and(
              eq(assets.id, parsed.data.toAssetId),
              eq(assets.userId, userId),
            ),
          )
          .limit(1);

        if (!found) {
          return {
            success: false,
            error: "이체 대상 자산이 존재하지 않습니다.",
          };
        }
        toAsset = found;
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
      if (parsed.data.type === "TRANSFER" && parsed.data.toAssetId && toAsset) {
        // 소유권 검증 시 이미 type을 가져왔으므로 추가 쿼리 없음
        const toAssetType = toAsset.type;
        const fromAssetType = asset[0].type;

        if (toAssetType === "STOCK") {
          // 실제 목적지가 주식계좌 → cashBalance 증가
          const [[inserted]] = await db.batch([
            insertQuery,
            fromAssetType === "STOCK"
              ? db
                  .update(assets)
                  .set({
                    cashBalance: sql`${assets.cashBalance}::numeric - ${amount}`,
                  })
                  .where(eq(assets.id, parsed.data.assetId))
              : fromBalanceQuery,
            db
              .update(assets)
              .set({
                cashBalance: sql`${assets.cashBalance}::numeric + ${amount}`,
              })
              .where(eq(assets.id, parsed.data.toAssetId)),
          ]);
          result = inserted;
          const syncWarningsCreate: string[] = [];
          const safeSync = makeSafeSync(userId, syncWarningsCreate);
          await safeSync(parsed.data.toAssetId);
          if (fromAssetType === "STOCK") {
            await safeSync(parsed.data.assetId);
          }
        } else if (fromAssetType === "STOCK") {
          // 출발지가 주식계좌 → cashBalance 감소
          const [[inserted]] = await db.batch([
            insertQuery,
            db
              .update(assets)
              .set({
                cashBalance: sql`${assets.cashBalance}::numeric - ${amount}`,
              })
              .where(eq(assets.id, parsed.data.assetId)),
            db
              .update(assets)
              .set({
                balance: sql`${assets.balance} + ${amount}`,
                updatedAt: new Date(),
              })
              .where(eq(assets.id, parsed.data.toAssetId)),
          ]);
          result = inserted;
          const syncWarningsCreateFrom: string[] = [];
          await makeSafeSync(
            userId,
            syncWarningsCreateFrom,
          )(parsed.data.assetId);
        } else {
          // 일반 자산 → 기존 로직
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
        }
      } else {
        const [[inserted]] = await db.batch([insertQuery, fromBalanceQuery]);
        result = inserted;
      }

      revalidatePath("/");

      return { success: true, data: result };
    } catch (error) {
      console.error("Error creating asset transaction:", error);
      return { success: false, error: "자산 거래 생성에 실패했습니다." };
    }
  });
}

/**
 * 자산 거래 목록 조회
 */
export async function getAssetTransactions(assetId?: number) {
  return withAuth(async (userId) => {
    try {
      const today = dayjs().format("YYYY-MM-DD");
      const conditions = [
        eq(assetTransactions.userId, userId),
        lte(assetTransactions.date, today),
      ];
      if (assetId) {
        // 해당 자산이 출발지이거나, 이체 목적지인 거래 모두 조회
        conditions.push(
          or(
            eq(assetTransactions.assetId, assetId),
            eq(assetTransactions.toAssetId, assetId),
          )!,
        );
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
        .orderBy(
          desc(assetTransactions.date),
          desc(assetTransactions.createdAt),
        );

      return { success: true, data: result };
    } catch (error) {
      console.error("Error fetching asset transactions:", error);
      return { success: false, error: "자산 거래 목록 조회에 실패했습니다." };
    }
  });
}

/**
 * 자산 거래 단건 조회
 */
export async function getAssetTransactionById(id: number) {
  return withAuth(async (userId) => {
    try {
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
            eq(assetTransactions.userId, userId),
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
  });
}

/**
 * 자산 거래 수정
 */
export async function updateAssetTransaction(
  id: number,
  data: Partial<AssetTransactionInput>,
) {
  return withAuth(async (userId) => {
    try {
      // 기존 거래 조회
      const existing = await db
        .select()
        .from(assetTransactions)
        .where(
          and(
            eq(assetTransactions.id, id),
            eq(assetTransactions.userId, userId),
          ),
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

      const parsed = assetTransactionUpdateSchema.safeParse(data);
      if (!parsed.success) {
        return {
          success: false,
          error: z.flattenError(parsed.error).fieldErrors,
        };
      }

      // 거래 정보 업데이트 데이터 준비
      const updateData: Partial<typeof assetTransactions.$inferInsert> = {
        updatedAt: new Date(),
        ...(parsed.data.assetId !== undefined && {
          assetId: parsed.data.assetId,
        }),
        ...(parsed.data.type !== undefined && { type: parsed.data.type }),
        ...(parsed.data.amount !== undefined && {
          amount: parsed.data.amount.toString(),
        }),
        ...(parsed.data.date !== undefined && { date: parsed.data.date }),
        ...(parsed.data.memo !== undefined && {
          memo: parsed.data.memo || null,
        }),
        ...(parsed.data.toAssetId !== undefined && {
          toAssetId: parsed.data.toAssetId || null,
        }),
      };

      const newAssetId = parsed.data.assetId ?? existing[0].assetId;
      const newType = parsed.data.type ?? existing[0].type;
      const newAmount = parsed.data.amount?.toString() ?? existing[0].amount;
      const newToAssetId = parsed.data.toAssetId ?? existing[0].toAssetId;

      // 기존/신규 자산 타입 한 번에 조회
      const assetIdsToFetch = Array.from(
        new Set(
          [
            existing[0].assetId,
            existing[0].toAssetId,
            newAssetId,
            newToAssetId,
          ].filter((v): v is number => v != null),
        ),
      );
      const assetTypeInfos = await db
        .select({ id: assets.id, type: assets.type })
        .from(assets)
        .where(
          and(inArray(assets.id, assetIdsToFetch), eq(assets.userId, userId)),
        );

      if (assetTypeInfos.length !== assetIdsToFetch.length) {
        return {
          success: false,
          error: "수정 대상 자산이 유효하지 않거나 접근 권한이 없습니다.",
        };
      }

      const assetTypeMap = new Map(assetTypeInfos.map((a) => [a.id, a.type]));

      const existingFromType = assetTypeMap.get(existing[0].assetId);
      const existingToType = existing[0].toAssetId
        ? assetTypeMap.get(existing[0].toAssetId)
        : undefined;
      const newFromType = assetTypeMap.get(newAssetId);
      const newToType = newToAssetId
        ? assetTypeMap.get(newToAssetId)
        : undefined;

      const existingOp = getBalanceOperation(existing[0].type);
      const reverseOp = existingOp === "add" ? "subtract" : "add";
      const newOp = getBalanceOperation(newType);

      // batch 쿼리 구성: 역연산 → 거래 수정 → 새 적용
      const queries: BatchItem<"pg">[] = [];

      // 1. 기존 잔액 역연산
      if (existing[0].type === "TRANSFER" && existing[0].toAssetId) {
        if (existingToType === "STOCK") {
          queries.push(
            db
              .update(assets)
              .set({
                cashBalance: sql`${assets.cashBalance}::numeric - ${existing[0].amount}`,
              })
              .where(eq(assets.id, existing[0].toAssetId)),
          );
          if (existingFromType === "STOCK") {
            queries.push(
              db
                .update(assets)
                .set({
                  cashBalance: sql`${assets.cashBalance}::numeric + ${existing[0].amount}`,
                })
                .where(eq(assets.id, existing[0].assetId)),
            );
          } else {
            queries.push(
              db
                .update(assets)
                .set({
                  balance: sql`${assets.balance} + ${existing[0].amount}`,
                  updatedAt: new Date(),
                })
                .where(eq(assets.id, existing[0].assetId)),
            );
          }
        } else if (existingFromType === "STOCK") {
          queries.push(
            db
              .update(assets)
              .set({
                cashBalance: sql`${assets.cashBalance}::numeric + ${existing[0].amount}`,
              })
              .where(eq(assets.id, existing[0].assetId)),
          );
          queries.push(
            db
              .update(assets)
              .set({
                balance: sql`${assets.balance} - ${existing[0].amount}`,
                updatedAt: new Date(),
              })
              .where(eq(assets.id, existing[0].toAssetId)),
          );
        } else {
          queries.push(
            db
              .update(assets)
              .set({
                balance: sql`${assets.balance} + ${existing[0].amount}`,
                updatedAt: new Date(),
              })
              .where(eq(assets.id, existing[0].assetId)),
          );
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
      } else {
        queries.push(
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
      if (newType === "TRANSFER" && newToAssetId) {
        if (newToType === "STOCK") {
          if (newFromType === "STOCK") {
            queries.push(
              db
                .update(assets)
                .set({
                  cashBalance: sql`${assets.cashBalance}::numeric - ${newAmount}`,
                })
                .where(eq(assets.id, newAssetId)),
            );
          } else {
            queries.push(
              db
                .update(assets)
                .set({
                  balance: sql`${assets.balance} - ${newAmount}`,
                  updatedAt: new Date(),
                })
                .where(eq(assets.id, newAssetId)),
            );
          }
          queries.push(
            db
              .update(assets)
              .set({
                cashBalance: sql`${assets.cashBalance}::numeric + ${newAmount}`,
              })
              .where(eq(assets.id, newToAssetId)),
          );
        } else if (newFromType === "STOCK") {
          queries.push(
            db
              .update(assets)
              .set({
                cashBalance: sql`${assets.cashBalance}::numeric - ${newAmount}`,
              })
              .where(eq(assets.id, newAssetId)),
          );
          queries.push(
            db
              .update(assets)
              .set({
                balance: sql`${assets.balance} + ${newAmount}`,
                updatedAt: new Date(),
              })
              .where(eq(assets.id, newToAssetId)),
          );
        } else {
          queries.push(
            db
              .update(assets)
              .set({
                balance: sql`${assets.balance} - ${newAmount}`,
                updatedAt: new Date(),
              })
              .where(eq(assets.id, newAssetId)),
          );
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
      } else {
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
      }

      const results = await db.batch(
        queries as [BatchItem<"pg">, ...BatchItem<"pg">[]],
      );
      const updated = results[returningIndex][0];

      // STOCK 관련 잔액 동기화 (실패해도 수정 자체는 성공으로 반환)
      const syncWarningsUpdate: string[] = [];
      const safeSync = makeSafeSync(userId, syncWarningsUpdate);
      const stockAssetIds = new Set<number>();
      if (existingFromType === "STOCK") stockAssetIds.add(existing[0].assetId);
      if (existingToType === "STOCK" && existing[0].toAssetId)
        stockAssetIds.add(existing[0].toAssetId);
      if (newFromType === "STOCK") stockAssetIds.add(newAssetId);
      if (newToType === "STOCK" && newToAssetId)
        stockAssetIds.add(newToAssetId);
      for (const stockId of stockAssetIds) {
        await safeSync(stockId);
      }

      revalidatePath("/");

      return { success: true, data: updated };
    } catch (error) {
      console.error("Error updating asset transaction:", error);
      return { success: false, error: "자산 거래 수정에 실패했습니다." };
    }
  });
}

/**
 * 자산 거래 삭제
 */
export async function deleteAssetTransaction(id: number) {
  return withAuth(async (userId) => {
    try {
      // 기존 거래 조회
      const existing = await db
        .select()
        .from(assetTransactions)
        .where(
          and(
            eq(assetTransactions.id, id),
            eq(assetTransactions.userId, userId),
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

      // 기존 자산 타입 조회
      const deleteAssetIdsToFetch = Array.from(
        new Set(
          [existing[0].assetId, existing[0].toAssetId].filter(
            (v): v is number => v != null,
          ),
        ),
      );
      const deleteAssetTypeInfos = await db
        .select({ id: assets.id, type: assets.type })
        .from(assets)
        .where(
          and(
            inArray(assets.id, deleteAssetIdsToFetch),
            eq(assets.userId, userId),
          ),
        );

      if (deleteAssetTypeInfos.length !== deleteAssetIdsToFetch.length) {
        return {
          success: false,
          error: "삭제 대상 자산이 유효하지 않거나 접근 권한이 없습니다.",
        };
      }

      const deleteAssetTypeMap = new Map(
        deleteAssetTypeInfos.map((a) => [a.id, a.type]),
      );
      const existingFromType = deleteAssetTypeMap.get(existing[0].assetId);
      const existingToType = existing[0].toAssetId
        ? deleteAssetTypeMap.get(existing[0].toAssetId)
        : undefined;

      const existingOp = getBalanceOperation(existing[0].type);
      const reverseOp = existingOp === "add" ? "subtract" : "add";

      const deleteQuery = db
        .delete(assetTransactions)
        .where(eq(assetTransactions.id, id));

      if (existing[0].type === "TRANSFER" && existing[0].toAssetId) {
        const batchQueries: BatchItem<"pg">[] = [];

        if (existingToType === "STOCK") {
          batchQueries.push(
            db
              .update(assets)
              .set({
                cashBalance: sql`${assets.cashBalance}::numeric - ${existing[0].amount}`,
              })
              .where(eq(assets.id, existing[0].toAssetId)),
          );
          if (existingFromType === "STOCK") {
            batchQueries.push(
              db
                .update(assets)
                .set({
                  cashBalance: sql`${assets.cashBalance}::numeric + ${existing[0].amount}`,
                })
                .where(eq(assets.id, existing[0].assetId)),
            );
          } else {
            batchQueries.push(
              db
                .update(assets)
                .set({
                  balance: sql`${assets.balance} + ${existing[0].amount}`,
                  updatedAt: new Date(),
                })
                .where(eq(assets.id, existing[0].assetId)),
            );
          }
        } else if (existingFromType === "STOCK") {
          batchQueries.push(
            db
              .update(assets)
              .set({
                cashBalance: sql`${assets.cashBalance}::numeric + ${existing[0].amount}`,
              })
              .where(eq(assets.id, existing[0].assetId)),
          );
          batchQueries.push(
            db
              .update(assets)
              .set({
                balance: sql`${assets.balance} - ${existing[0].amount}`,
                updatedAt: new Date(),
              })
              .where(eq(assets.id, existing[0].toAssetId)),
          );
        } else {
          batchQueries.push(
            db
              .update(assets)
              .set({
                balance: sql`${assets.balance} + ${existing[0].amount}`,
                updatedAt: new Date(),
              })
              .where(eq(assets.id, existing[0].assetId)),
          );
          batchQueries.push(
            db
              .update(assets)
              .set({
                balance: sql`${assets.balance} - ${existing[0].amount}`,
                updatedAt: new Date(),
              })
              .where(eq(assets.id, existing[0].toAssetId)),
          );
        }

        batchQueries.push(deleteQuery);
        await db.batch(batchQueries as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

        // STOCK 잔액 동기화 (실패해도 삭제 자체는 성공으로 반환)
        const syncWarningsDelete: string[] = [];
        const safeSync = makeSafeSync(userId, syncWarningsDelete);
        if (existingFromType === "STOCK") await safeSync(existing[0].assetId);
        if (existingToType === "STOCK" && existing[0].toAssetId)
          await safeSync(existing[0].toAssetId);
      } else {
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
        await db.batch([reverseQuery, deleteQuery]);
      }

      revalidatePath("/");

      return { success: true };
    } catch (error) {
      console.error("Error deleting asset transaction:", error);
      return { success: false, error: "자산 거래 삭제에 실패했습니다." };
    }
  });
}
