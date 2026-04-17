import { describe, expect, it } from "vitest";
import {
  goldBuyFormSchema,
  goldSellFormSchema,
  goldTradeInputSchema,
} from "@/lib/validations/gold";

describe("goldTradeInputSchema", () => {
  it("유효한 BUY 입력을 통과시킨다", () => {
    const result = goldTradeInputSchema.safeParse({
      assetId: 1,
      type: "BUY",
      gram: 1.25,
      pricePerGram: 145000,
      tradeDate: "2026-04-08",
      memo: "추가 매수",
    });
    expect(result.success).toBe(true);
  });

  it("gram이 0이면 실패한다", () => {
    const result = goldTradeInputSchema.safeParse({
      assetId: 1,
      type: "SELL",
      gram: 0,
      pricePerGram: 145000,
      tradeDate: "2026-04-08",
    });
    expect(result.success).toBe(false);
  });

  it("유효하지 않은 달력 날짜는 실패한다", () => {
    const result = goldTradeInputSchema.safeParse({
      assetId: 1,
      type: "BUY",
      gram: 1,
      pricePerGram: 145000,
      tradeDate: "2026-02-31",
    });
    expect(result.success).toBe(false);
  });
});

describe("goldBuyFormSchema", () => {
  it("유효한 문자열 폼 입력을 통과시킨다", () => {
    const result = goldBuyFormSchema.safeParse({
      gram: "2.500001",
      pricePerGram: "150000",
      tradeDate: new Date("2026-04-08"),
      memo: "",
    });
    expect(result.success).toBe(true);
  });

  it("gram 소수점 7자리 입력은 실패한다", () => {
    const result = goldBuyFormSchema.safeParse({
      gram: "0.1234567",
      pricePerGram: "150000",
      tradeDate: new Date("2026-04-08"),
      memo: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("goldSellFormSchema", () => {
  it("매도 단가 0은 실패한다", () => {
    const result = goldSellFormSchema.safeParse({
      gram: "1.5",
      pricePerGram: "0",
      tradeDate: new Date("2026-04-08"),
      memo: "",
    });
    expect(result.success).toBe(false);
  });
});
