import { describe, expect, it } from "vitest";
import {
  calculateGoldRealizedProfit,
  calculateGoldTradeAmount,
  calculateWeightedAverageGoldBuyPrice,
} from "@/lib/gold/calc";

describe("gold calc", () => {
  it("매수 후 평균단가를 가중평균으로 계산한다", () => {
    // 기존 2g @100,000 + 신규 1g @130,000 => 3g @110,000
    const avg = calculateWeightedAverageGoldBuyPrice(2, 100000, 1, 130000);
    expect(avg).toBe(110000);
  });

  it("매도 실현손익을 (매도가-평단가)*수량으로 계산한다", () => {
    const profit = calculateGoldRealizedProfit(100000, 120000, 1.5);
    expect(profit).toBe(30000);
  });

  it("거래금액을 원 단위 반올림한다", () => {
    const amount = calculateGoldTradeAmount(0.123456, 145000.49);
    expect(amount).toBe(Math.round(0.123456 * 145000.49));
  });
});
