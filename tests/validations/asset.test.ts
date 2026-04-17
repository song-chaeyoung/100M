import { describe, expect, it } from "vitest";
import { assetFormSchema, assetTypeSchema } from "@/lib/validations/asset";

describe("assetTypeSchema", () => {
  it("GOLD 타입을 허용한다", () => {
    const result = assetTypeSchema.safeParse("GOLD");
    expect(result.success).toBe(true);
  });
});

describe("assetFormSchema - GOLD", () => {
  const base = {
    name: "금 통장",
    type: "GOLD" as const,
    balance: "0",
    institution: "",
    accountNumber: "",
    interestRate: "",
  };

  it("goldGram 없이도 GOLD 폼 파싱에 성공한다", () => {
    const result = assetFormSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("goldGram이 전달되어도 폼 스키마에서 제거된다", () => {
    const result = assetFormSchema.safeParse({
      ...base,
      goldGram: "3.123456",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect("goldGram" in result.data).toBe(false);
  });
});
