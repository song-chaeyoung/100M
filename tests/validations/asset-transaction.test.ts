import { describe, it, expect } from "vitest";
import { assetTransactionSchema } from "@/lib/validations/asset-transaction";

describe("assetTransactionSchema", () => {
  // 정상 케이스
  it("유효한 DEPOSIT 데이터를 통과시킨다", () => {
    const result = assetTransactionSchema.safeParse({
      assetId: 1,
      type: "DEPOSIT",
      amount: 100000,
      date: "2025-06-15",
    });

    expect(result.success).toBe(true);
  });

  it("유효한 TRANSFER 데이터를 통과시킨다", () => {
    const result = assetTransactionSchema.safeParse({
      assetId: 1,
      type: "TRANSFER",
      amount: 50000,
      date: "2025-06-15",
      toAssetId: 2, // 다른 자산으로 이체
    });

    expect(result.success).toBe(true);
  });

  // === TRANSFER 특수 검증 ===

  // refine: 이체인데 대상 자산이 없으면 실패
  it("TRANSFER인데 toAssetId가 없으면 실패한다", () => {
    const result = assetTransactionSchema.safeParse({
      assetId: 1,
      type: "TRANSFER",
      amount: 50000,
      date: "2025-06-15",
      // toAssetId 누락!
    });

    expect(result.success).toBe(false);
  });

  // refine: 같은 자산으로 이체 불가
  it("TRANSFER인데 같은 자산으로 이체하면 실패한다", () => {
    const result = assetTransactionSchema.safeParse({
      assetId: 1,
      type: "TRANSFER",
      amount: 50000,
      date: "2025-06-15",
      toAssetId: 1, // 같은 자산!
    });

    expect(result.success).toBe(false);
  });

  // === 기본 검증 ===

  it("날짜 형식이 YYYY-MM-DD가 아니면 실패한다", () => {
    const result = assetTransactionSchema.safeParse({
      assetId: 1,
      type: "DEPOSIT",
      amount: 100000,
      date: "2025/06/15", // 잘못된 형식
    });

    expect(result.success).toBe(false);
  });

  it("금액이 0이면 실패한다", () => {
    const result = assetTransactionSchema.safeParse({
      assetId: 1,
      type: "WITHDRAW",
      amount: 0,
      date: "2025-06-15",
    });

    expect(result.success).toBe(false);
  });

  // DEPOSIT, WITHDRAW 등 비이체 타입은 toAssetId 없어도 됨
  it("WITHDRAW는 toAssetId 없이 통과한다", () => {
    const result = assetTransactionSchema.safeParse({
      assetId: 1,
      type: "WITHDRAW",
      amount: 30000,
      date: "2025-06-15",
    });

    expect(result.success).toBe(true);
  });
});
