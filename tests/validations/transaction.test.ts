import { describe, it, expect } from "vitest";
import { transactionSchema } from "@/lib/validations/transaction";

// ============================================================
// Zod 스키마 테스트 = "이 데이터가 유효한가?" 를 검증
// safeParse: 성공하면 { success: true, data }, 실패하면 { success: false, error }
// ============================================================

describe("transactionSchema", () => {
  // 정상 케이스: 모든 필수 필드가 있을 때
  it("유효한 INCOME 데이터를 통과시킨다", () => {
    const result = transactionSchema.safeParse({
      type: "INCOME",
      amount: 50000,
      method: "CARD",
      date: "2025-06-15",
      categoryId: 1,
    });

    expect(result.success).toBe(true);
  });

  it("유효한 EXPENSE 데이터를 통과시킨다", () => {
    const result = transactionSchema.safeParse({
      type: "EXPENSE",
      amount: 15000,
      method: "CASH",
      date: "2025-06-15",
      categoryId: 2,
    });

    expect(result.success).toBe(true);
  });

  // SAVING 타입은 categoryId, method가 없어도 됨
  it("SAVING 타입은 카테고리/결제수단 없이 통과한다", () => {
    const result = transactionSchema.safeParse({
      type: "SAVING",
      amount: 100000,
      date: "2025-06-15",
    });

    expect(result.success).toBe(true);
  });

  // === 실패 케이스 ===

  it("금액이 0이면 실패한다", () => {
    const result = transactionSchema.safeParse({
      type: "INCOME",
      amount: 0,
      method: "CARD",
      date: "2025-06-15",
      categoryId: 1,
    });

    expect(result.success).toBe(false);
  });

  it("금액이 음수면 실패한다", () => {
    const result = transactionSchema.safeParse({
      type: "EXPENSE",
      amount: -1000,
      method: "CARD",
      date: "2025-06-15",
      categoryId: 1,
    });

    expect(result.success).toBe(false);
  });

  it("날짜가 빈 문자열이면 실패한다", () => {
    const result = transactionSchema.safeParse({
      type: "INCOME",
      amount: 50000,
      method: "CARD",
      date: "",
      categoryId: 1,
    });

    expect(result.success).toBe(false);
  });

  // refine 검증: INCOME/EXPENSE에는 categoryId가 필수
  it("INCOME인데 카테고리가 없으면 실패한다", () => {
    const result = transactionSchema.safeParse({
      type: "INCOME",
      amount: 50000,
      method: "CARD",
      date: "2025-06-15",
      // categoryId 누락!
    });

    expect(result.success).toBe(false);
  });

  // refine 검증: INCOME/EXPENSE에는 method가 필수
  it("EXPENSE인데 결제수단이 없으면 실패한다", () => {
    const result = transactionSchema.safeParse({
      type: "EXPENSE",
      amount: 15000,
      date: "2025-06-15",
      categoryId: 2,
      // method 누락!
    });

    expect(result.success).toBe(false);
  });
});
