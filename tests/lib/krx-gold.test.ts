import { describe, expect, it } from "vitest";
import { parseKRXGoldPriceResponse } from "@/lib/krx-gold";

describe("parseKRXGoldPriceResponse", () => {
  it("종가가 있으면 종가를 우선 파싱한다", () => {
    const payload = {
      output: [
        {
          date: "2026-04-08",
          closePrice: "145000",
          currentPrice: "144500",
        },
      ],
    };

    const result = parseKRXGoldPriceResponse(payload);
    expect(result.pricePerGram).toBe(145000);
    expect(result.priceDate).toBe("2026-04-08");
  });

  it("단위가 kg면 g로 환산한다", () => {
    const payload = {
      response: {
        rows: [
          {
            BAS_DD: "20260408",
            TDD_CLSPRC: "140000000",
            UNIT: "kg",
          },
        ],
      },
    };

    const result = parseKRXGoldPriceResponse(payload, "2099-01-01");
    expect(result.pricePerGram).toBe(140000);
    expect(result.priceDate).toBe("2026-04-08");
    expect(result.isKgConverted).toBe(true);
  });

  it("단위 힌트가 없으면 고가여도 kg 변환하지 않는다", () => {
    const payload = {
      output: [
        {
          date: "2026-04-08",
          price: "140000000",
        },
      ],
    };

    const result = parseKRXGoldPriceResponse(payload);
    expect(result.pricePerGram).toBe(140000000);
    expect(result.isKgConverted).toBe(false);
  });

  it("종가가 없으면 현재가로 대체한다", () => {
    const payload = {
      output: [
        {
          date: "2026-04-08",
          currentPrice: "146200",
        },
      ],
    };

    const result = parseKRXGoldPriceResponse(payload);
    expect(result.pricePerGram).toBe(146200);
  });

  it("가격 필드가 없으면 예외를 던진다", () => {
    const payload = {
      output: [{ date: "2026-04-08", value: "N/A" }],
    };

    expect(() => parseKRXGoldPriceResponse(payload)).toThrow();
  });

  it("유사 키(priceDate)만 있으면 예외를 던진다", () => {
    const payload = {
      output: [{ date: "2026-04-08", priceDate: "20260408" }],
    };

    expect(() => parseKRXGoldPriceResponse(payload)).toThrow();
  });
});
