import { describe, it, expect } from "vitest";
import { formatCurrency, formatAmount, getMonthsBetween } from "@/lib/utils";

// ============================================================
// describe: 테스트를 그룹으로 묶는 역할
// it: 하나의 테스트 케이스 (= test와 같음)
// expect: 결과가 예상과 맞는지 검증
// ============================================================

describe("formatCurrency", () => {
  // 가장 기본적인 테스트: 1000 → "1,000원"
  it("금액을 한국 원화 형식으로 포맷한다", () => {
    expect(formatCurrency(1000)).toBe("1,000원");
    expect(formatCurrency(1234567)).toBe("1,234,567원");
    expect(formatCurrency(0)).toBe("0원");
  });

  // showSign=true일 때 양수에 + 붙는지
  it("showSign이 true이면 양수에 + 부호를 붙인다", () => {
    expect(formatCurrency(1000, true)).toBe("+1,000원");
    expect(formatCurrency(500000, true)).toBe("+500,000원");
  });

  // 음수 처리: showSign과 무관하게 음수면 항상 - 붙음
  it("음수는 항상 - 부호를 붙인다", () => {
    expect(formatCurrency(-1000)).toBe("-1,000원");
    expect(formatCurrency(-1000, true)).toBe("-1,000원");
  });

  // 0은 부호가 없어야 함
  it("0은 부호가 없다", () => {
    expect(formatCurrency(0, true)).toBe("0원");
  });
});

describe("formatAmount", () => {
  // 사용자가 입력 중에 콤마를 자동으로 찍어주는 함수
  it("숫자 문자열에 콤마를 추가한다", () => {
    expect(formatAmount("1000")).toBe("1,000");
    expect(formatAmount("1234567")).toBe("1,234,567");
  });

  it("이미 콤마가 있는 문자열도 처리한다", () => {
    expect(formatAmount("1,000,000")).toBe("1,000,000");
  });

  it("숫자가 아닌 문자를 제거한다", () => {
    expect(formatAmount("abc")).toBe("");
    expect(formatAmount("1a2b3")).toBe("123");
  });

  it("빈 문자열을 처리한다", () => {
    expect(formatAmount("")).toBe("");
  });
});

describe("getMonthsBetween", () => {
  // 시작월~종료월 사이의 모든 월을 배열로 반환
  it("시작월부터 종료월까지의 월 배열을 반환한다", () => {
    const result = getMonthsBetween("2025-01", "2025-03");
    expect(result).toEqual(["2025-01", "2025-02", "2025-03"]);
  });

  it("같은 월이면 하나만 반환한다", () => {
    const result = getMonthsBetween("2025-06", "2025-06");
    expect(result).toEqual(["2025-06"]);
  });

  it("연도를 넘어가는 경우도 처리한다", () => {
    const result = getMonthsBetween("2025-11", "2026-02");
    expect(result).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});
