import { describe, it, expect } from "vitest";
import { calcHoldingStats, calcTotalStats } from "@/lib/stocks/calc";
import type {
  StockHoldingResponse,
  StockPriceResponse,
} from "@/lib/validations/stock";

// ─────────────────────────────────────────────
// 테스트용 픽스처 (공통 데이터)
// ─────────────────────────────────────────────

const krHolding: StockHoldingResponse = {
  id: 1,
  userId: "user1",
  assetId: 1,
  stockCode: "005930",
  stockName: "삼성전자",
  country: "KR",
  currency: "KRW",
  quantity: 10,
  avgPrice: "70000", // 평단가 70,000원
  memo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const usHolding: StockHoldingResponse = {
  id: 2,
  userId: "user1",
  assetId: 1,
  stockCode: "AAPL",
  stockName: "Apple Inc.",
  country: "US",
  currency: "USD",
  quantity: 2,
  avgPrice: "180", // 평단가 $180
  memo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const krPrice: StockPriceResponse = {
  id: 1,
  stockCode: "005930",
  stockName: "삼성전자",
  market: "KOSPI",
  country: "KR",
  currentPrice: "75000",
  previousClose: "74000",
  changeRate: "1.35",
  currency: "KRW",
  krwPrice: "75000", // 현재 주가 75,000원
  exchangeRate: null,
  priceDate: "2025-06-20",
  updatedAt: new Date(),
};

const usPrice: StockPriceResponse = {
  id: 2,
  stockCode: "AAPL",
  stockName: "Apple Inc.",
  market: "NASDAQ",
  country: "US",
  currentPrice: "200", // 현재 주가 $200
  previousClose: "195",
  changeRate: "2.56",
  currency: "USD",
  krwPrice: "280000", // KRW 환산: $200 * 1400원
  exchangeRate: "1400", // 환율 1,400원/달러
  priceDate: "2025-06-20",
  updatedAt: new Date(),
};

// ─────────────────────────────────────────────
// calcHoldingStats 테스트
// ─────────────────────────────────────────────

describe("calcHoldingStats", () => {
  describe("가격 정보가 없을 때 (price = undefined)", () => {
    it("evalAmount, profitLoss, profitRate, changeRate가 모두 null이다", () => {
      const stats = calcHoldingStats(krHolding, undefined);

      expect(stats.currentPriceKRW).toBeNull();
      expect(stats.evalAmount).toBeNull();
      expect(stats.profitLoss).toBeNull();
      expect(stats.profitRate).toBeNull();
      expect(stats.changeRate).toBeNull();
    });

    it("investAmount는 평단가 × 수량으로 계산된다", () => {
      const stats = calcHoldingStats(krHolding, undefined);
      // 평단가 70,000원 × 10주 = 700,000원
      expect(stats.investAmount).toBe(700000);
    });
  });

  describe("국내(KR) 종목 계산", () => {
    it("평가금액 = 현재가 × 수량", () => {
      const stats = calcHoldingStats(krHolding, krPrice);
      // 75,000원 × 10주 = 750,000원
      expect(stats.evalAmount).toBe(750000);
    });

    it("투자금액 = 평단가 × 수량 (KRW 그대로 사용)", () => {
      const stats = calcHoldingStats(krHolding, krPrice);
      // 70,000원 × 10주 = 700,000원
      expect(stats.investAmount).toBe(700000);
    });

    it("손익 = 평가금액 - 투자금액", () => {
      const stats = calcHoldingStats(krHolding, krPrice);
      // 750,000 - 700,000 = +50,000원
      expect(stats.profitLoss).toBe(50000);
    });

    it("수익률 = 손익 / 투자금액 × 100", () => {
      const stats = calcHoldingStats(krHolding, krPrice);
      // 50,000 / 700,000 × 100 ≈ 7.14%
      expect(stats.profitRate).toBeCloseTo(7.142857, 2);
    });

    it("등락률은 price.changeRate에서 가져온다", () => {
      const stats = calcHoldingStats(krHolding, krPrice);
      expect(stats.changeRate).toBe(1.35);
    });
  });

  describe("해외(US) 종목 계산 — 환율 적용", () => {
    it("평가금액은 krwPrice × 수량으로 계산된다", () => {
      const stats = calcHoldingStats(usHolding, usPrice);
      // KRW 환산 현재가 280,000원 × 2주 = 560,000원
      expect(stats.evalAmount).toBe(560000);
    });

    it("투자금액은 평단가(USD) × 환율 × 수량으로 계산된다", () => {
      const stats = calcHoldingStats(usHolding, usPrice);
      // $180 × 1,400원 × 2주 = 504,000원
      expect(stats.investAmount).toBe(504000);
    });

    it("손익은 환율이 적용된 KRW 기준으로 계산된다", () => {
      const stats = calcHoldingStats(usHolding, usPrice);
      // 560,000 - 504,000 = +56,000원
      expect(stats.profitLoss).toBe(56000);
    });

    it("환율 정보가 없으면 평단가를 USD 그대로 KRW로 취급한다", () => {
      const priceWithoutExchangeRate: StockPriceResponse = {
        ...usPrice,
        exchangeRate: null,
      };
      const stats = calcHoldingStats(usHolding, priceWithoutExchangeRate);
      // 환율 없으면: $180 × 2 = 360원 (환산 없이 그대로)
      expect(stats.investAmount).toBe(360);
    });
  });

  describe("손익이 0인 경우", () => {
    it("현재가와 평단가가 같으면 손익은 0, 수익률도 0이다", () => {
      const breakEvenPrice: StockPriceResponse = {
        ...krPrice,
        currentPrice: "70000",
        krwPrice: "70000",
        changeRate: "0",
      };
      const stats = calcHoldingStats(krHolding, breakEvenPrice);

      expect(stats.profitLoss).toBe(0);
      expect(stats.profitRate).toBe(0);
      expect(stats.changeRate).toBe(0);
    });
  });

  describe("손실인 경우", () => {
    it("현재가가 평단가보다 낮으면 손익이 음수다", () => {
      const lossPrice: StockPriceResponse = {
        ...krPrice,
        currentPrice: "60000",
        krwPrice: "60000",
      };
      const stats = calcHoldingStats(krHolding, lossPrice);
      // 600,000 - 700,000 = -100,000원
      expect(stats.profitLoss).toBe(-100000);
      expect(stats.profitRate).toBeCloseTo(-14.285714, 2);
    });
  });
});

// ─────────────────────────────────────────────
// calcTotalStats 테스트
// ─────────────────────────────────────────────

describe("calcTotalStats", () => {
  it("보유 종목이 없으면 모든 값이 0이다", () => {
    const stats = calcTotalStats([]);

    expect(stats.totalEvalKRW).toBe(0);
    expect(stats.totalInvestedKRW).toBe(0);
    expect(stats.totalProfitLoss).toBe(0);
    expect(stats.totalProfitRate).toBe(0);
  });

  it("국내 단일 종목 합산이 정확하다", () => {
    const stats = calcTotalStats([{ holding: krHolding, price: krPrice }]);
    // 평가: 75,000 × 10 = 750,000원
    // 투자: 70,000 × 10 = 700,000원
    expect(stats.totalEvalKRW).toBe(750000);
    expect(stats.totalInvestedKRW).toBe(700000);
    expect(stats.totalProfitLoss).toBe(50000);
    expect(stats.totalProfitRate).toBeCloseTo(7.142857, 2);
  });

  it("해외 단일 종목 합산이 정확하다 (환율 적용)", () => {
    const stats = calcTotalStats([{ holding: usHolding, price: usPrice }]);
    // 평가: 280,000 × 2 = 560,000원 (krwPrice 사용)
    // 투자: $180 × 1,400 × 2 = 504,000원
    expect(stats.totalEvalKRW).toBe(560000);
    expect(stats.totalInvestedKRW).toBe(504000);
    expect(stats.totalProfitLoss).toBe(56000);
  });

  it("국내+해외 혼합 종목의 합산이 정확하다", () => {
    const stats = calcTotalStats([
      { holding: krHolding, price: krPrice },
      { holding: usHolding, price: usPrice },
    ]);
    // 평가 합산: 750,000 + 560,000 = 1,310,000원
    // 투자 합산: 700,000 + 504,000 = 1,204,000원
    expect(stats.totalEvalKRW).toBe(1310000);
    expect(stats.totalInvestedKRW).toBe(1204000);
    expect(stats.totalProfitLoss).toBe(106000);
  });

  it("가격 정보가 없는 종목은 평가금액 합산에서 제외된다", () => {
    const stats = calcTotalStats([
      { holding: krHolding, price: krPrice },
      { holding: usHolding, price: undefined }, // 가격 없음
    ]);
    // 평가는 국내만: 750,000원
    // 투자는 국내만: 700,000원 (US는 가격 없으면 환율도 없음 → 평단가 그대로)
    expect(stats.totalEvalKRW).toBe(750000);
  });

  it("전체 투자금이 0이면 수익률을 0으로 반환한다", () => {
    // 투자금이 0이 되는 극단적 케이스 (quantity: 0) → 실제로는 유효성 검증에서 막히지만
    // calcTotalStats 자체는 안전하게 처리해야 함
    const zeroQuantityHolding: StockHoldingResponse = {
      ...krHolding,
      quantity: 0,
    };
    const stats = calcTotalStats([
      { holding: zeroQuantityHolding, price: krPrice },
    ]);
    expect(stats.totalProfitRate).toBe(0);
  });

  it("전체 수익률 = 총손익 / 총투자금 × 100", () => {
    const stats = calcTotalStats([
      { holding: krHolding, price: krPrice },
      { holding: usHolding, price: usPrice },
    ]);
    // (106,000 / 1,204,000) × 100 ≈ 8.806%
    expect(stats.totalProfitRate).toBeCloseTo(8.8039, 2);
  });
});
