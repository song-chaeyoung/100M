import { describe, it, expect } from "vitest";
import {
  stockHoldingFormSchema,
  stockHoldingResponseSchema,
  stockPriceResponseSchema,
} from "@/lib/validations/stock";

// ─────────────────────────────────────────────
// stockHoldingFormSchema 테스트
// ─────────────────────────────────────────────

describe("stockHoldingFormSchema", () => {
  // 유효한 기본값 (각 테스트에서 spread로 재사용)
  const validKrData = {
    assetId: 1,
    stockCode: "005930",
    stockName: "삼성전자",
    country: "KR" as const,
    market: "KOSPI",
    quantity: "10",
    avgPrice: "70000",
    memo: "",
    recordAsSaving: false,
    purchaseDate: "2025-06-01",
  };

  const validUsData = {
    assetId: 1,
    stockCode: "AAPL",
    stockName: "Apple Inc.",
    country: "US" as const,
    market: "NASDAQ",
    quantity: "0.5",
    avgPrice: "180.5",
    memo: "장기 보유",
    recordAsSaving: false,
    purchaseDate: "2025-06-01",
  };

  describe("정상 케이스", () => {
    it("국내(KR) 유효한 데이터를 통과시킨다", () => {
      const result = stockHoldingFormSchema.safeParse(validKrData);
      expect(result.success).toBe(true);
    });

    it("해외(US) 소수점 수량을 통과시킨다", () => {
      const result = stockHoldingFormSchema.safeParse(validUsData);
      expect(result.success).toBe(true);
    });

    it("memo 없이도 통과한다", () => {
      const result = stockHoldingFormSchema.safeParse({
        ...validKrData,
        memo: undefined,
      });
      expect(result.success).toBe(true);
    });

    it("콤마가 포함된 수량 문자열을 통과시킨다", () => {
      // quantity refine 로직: v.replace(/,/g, "") 후 Number 변환
      const result = stockHoldingFormSchema.safeParse({
        ...validKrData,
        quantity: "1,000",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("stockCode 검증", () => {
    it("stockCode가 빈 문자열이면 실패한다", () => {
      const result = stockHoldingFormSchema.safeParse({
        ...validKrData,
        stockCode: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("quantity 검증", () => {
    it("quantity가 빈 문자열이면 실패한다", () => {
      const result = stockHoldingFormSchema.safeParse({
        ...validKrData,
        quantity: "",
      });
      expect(result.success).toBe(false);
    });

    it("quantity가 '0'이면 실패한다", () => {
      const result = stockHoldingFormSchema.safeParse({
        ...validKrData,
        quantity: "0",
      });
      expect(result.success).toBe(false);
    });

    it("quantity가 음수면 실패한다", () => {
      const result = stockHoldingFormSchema.safeParse({
        ...validKrData,
        quantity: "-1",
      });
      expect(result.success).toBe(false);
    });

    it("quantity가 숫자가 아닌 문자면 실패한다", () => {
      const result = stockHoldingFormSchema.safeParse({
        ...validKrData,
        quantity: "abc",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("avgPrice 검증", () => {
    it("avgPrice가 빈 문자열이면 실패한다", () => {
      const result = stockHoldingFormSchema.safeParse({
        ...validKrData,
        avgPrice: "",
      });
      expect(result.success).toBe(false);
    });

    it("avgPrice가 '0'이면 실패한다", () => {
      const result = stockHoldingFormSchema.safeParse({
        ...validKrData,
        avgPrice: "0",
      });
      expect(result.success).toBe(false);
    });

    it("avgPrice가 음수면 실패한다", () => {
      const result = stockHoldingFormSchema.safeParse({
        ...validKrData,
        avgPrice: "-100",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("country 검증", () => {
    it("country가 'KR' 또는 'US'만 허용된다", () => {
      const validKR = stockHoldingFormSchema.safeParse(validKrData);
      const validUS = stockHoldingFormSchema.safeParse(validUsData);
      expect(validKR.success).toBe(true);
      expect(validUS.success).toBe(true);
    });

    it("country가 다른 값이면 실패한다", () => {
      const result = stockHoldingFormSchema.safeParse({
        ...validKrData,
        country: "JP",
      });
      expect(result.success).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────
// stockHoldingResponseSchema 테스트
// ─────────────────────────────────────────────

describe("stockHoldingResponseSchema", () => {
  const validResponse = {
    id: 1,
    userId: "user-abc",
    assetId: 2,
    stockCode: "005930",
    stockName: "삼성전자",
    country: "KR",
    quantity: "10.5", // DB에서 decimal 문자열로 반환
    avgPrice: "70000",
    currency: "KRW",
    memo: null,
    createdAt: "2025-06-01T00:00:00.000Z",
    updatedAt: "2025-06-20T00:00:00.000Z",
  };

  it("유효한 DB 응답을 통과시킨다", () => {
    const result = stockHoldingResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it("quantity 문자열 '10.5'를 숫자 10.5로 coerce한다", () => {
    const result = stockHoldingResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(10.5);
      expect(typeof result.data.quantity).toBe("number");
    }
  });

  it("createdAt 문자열을 Date 객체로 변환한다", () => {
    const result = stockHoldingResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.createdAt).toBeInstanceOf(Date);
      expect(result.data.updatedAt).toBeInstanceOf(Date);
    }
  });

  it("memo는 null이어도 통과한다", () => {
    const result = stockHoldingResponseSchema.safeParse({
      ...validResponse,
      memo: null,
    });
    expect(result.success).toBe(true);
  });

  it("quantity가 0 이하면 실패한다 (positive 검증)", () => {
    const result = stockHoldingResponseSchema.safeParse({
      ...validResponse,
      quantity: "0",
    });
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// stockPriceResponseSchema 테스트
// ─────────────────────────────────────────────

describe("stockPriceResponseSchema", () => {
  const validPriceResponse = {
    id: 1,
    stockCode: "005930",
    stockName: "삼성전자",
    market: "KOSPI",
    country: "KR",
    currentPrice: "75000",
    previousClose: "74000",
    changeRate: "1.35",
    currency: "KRW",
    krwPrice: "75000",
    exchangeRate: null,
    priceDate: "2025-06-20",
    updatedAt: "2025-06-20T09:00:00.000Z",
  };

  it("유효한 국내 주가 응답을 통과시킨다", () => {
    const result = stockPriceResponseSchema.safeParse(validPriceResponse);
    expect(result.success).toBe(true);
  });

  it("krwPrice가 null이어도 통과한다", () => {
    // 시세 없는 종목
    const result = stockPriceResponseSchema.safeParse({
      ...validPriceResponse,
      krwPrice: null,
    });
    expect(result.success).toBe(true);
  });

  it("changeRate가 null이어도 통과한다", () => {
    const result = stockPriceResponseSchema.safeParse({
      ...validPriceResponse,
      changeRate: null,
    });
    expect(result.success).toBe(true);
  });

  it("previousClose가 null이어도 통과한다", () => {
    const result = stockPriceResponseSchema.safeParse({
      ...validPriceResponse,
      previousClose: null,
    });
    expect(result.success).toBe(true);
  });

  it("해외 종목은 exchangeRate가 있어야 한다 (null 허용 스키마 확인)", () => {
    // 스키마 자체는 null을 허용하므로 통과해야 함
    // (exchangeRate는 calc.ts에서 null 체크 후 사용)
    const usPrice = {
      ...validPriceResponse,
      stockCode: "AAPL",
      stockName: "Apple Inc.",
      market: "NASDAQ",
      country: "US",
      currentPrice: "200",
      currency: "USD",
      krwPrice: "280000",
      exchangeRate: "1400",
    };
    const result = stockPriceResponseSchema.safeParse(usPrice);
    expect(result.success).toBe(true);
  });

  it("updatedAt 문자열을 Date 객체로 변환한다", () => {
    const result = stockPriceResponseSchema.safeParse(validPriceResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.updatedAt).toBeInstanceOf(Date);
    }
  });
});
