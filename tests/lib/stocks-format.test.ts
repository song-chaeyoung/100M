import { describe, it, expect } from "vitest";
import { formatKRW, formatUSD, formatPrice } from "@/lib/stocks/format";

describe("formatKRW", () => {
  it("정수를 한국 원화 형식으로 포맷한다", () => {
    expect(formatKRW(1000)).toBe("1,000원");
    expect(formatKRW(1234567)).toBe("1,234,567원");
    expect(formatKRW(100000000)).toBe("100,000,000원");
  });

  it("0을 처리한다", () => {
    expect(formatKRW(0)).toBe("0원");
  });

  it("음수를 처리한다", () => {
    expect(formatKRW(-1000)).toBe("-1,000원");
    expect(formatKRW(-50000)).toBe("-50,000원");
  });

  it("소수점이 있는 경우 처리한다", () => {
    // Math.round 후 전달되는 케이스 (컴포넌트에서 Math.round 후 호출)
    expect(formatKRW(1000.7)).toBe("1,000.7원");
  });
});

describe("formatUSD", () => {
  it("숫자를 USD 형식으로 포맷한다", () => {
    expect(formatUSD(1.23)).toBe("$1.23");
    expect(formatUSD(1000)).toBe("$1,000.00");
    expect(formatUSD(99.9)).toBe("$99.90");
  });

  it("소수점을 항상 2자리로 고정한다", () => {
    expect(formatUSD(5)).toBe("$5.00");
    expect(formatUSD(0.1)).toBe("$0.10");
    expect(formatUSD(123.456)).toBe("$123.46"); // 반올림
  });

  it("0을 처리한다", () => {
    expect(formatUSD(0)).toBe("$0.00");
  });

  it("음수를 처리한다", () => {
    expect(formatUSD(-10.5)).toBe("-$10.50");
  });

  it("큰 금액을 처리한다", () => {
    expect(formatUSD(12345.67)).toBe("$12,345.67");
  });
});

describe("formatPrice", () => {
  it("currency가 USD면 USD 형식으로 포맷한다", () => {
    expect(formatPrice(150.5, "USD")).toBe("$150.50");
    expect(formatPrice(0, "USD")).toBe("$0.00");
  });

  it("currency가 KRW면 원화 형식으로 포맷한다", () => {
    expect(formatPrice(75000, "KRW")).toBe("75,000원");
    expect(formatPrice(0, "KRW")).toBe("0원");
  });

  it("USD 외의 currency는 모두 KRW 형식으로 처리한다", () => {
    // currency === "USD"가 아닌 모든 값은 KRW 포맷
    expect(formatPrice(10000, "KRW")).toBe("10,000원");
    expect(formatPrice(10000, "JPY")).toBe("10,000원");
  });
});
