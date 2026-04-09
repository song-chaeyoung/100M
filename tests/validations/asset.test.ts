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

  it("goldGram 소수점 6자리 입력을 허용한다", () => {
    const result = assetFormSchema.safeParse({
      ...base,
      goldGram: "3.123456",
    });
    expect(result.success).toBe(true);
  });

  it("goldGram 미입력(건너뛰기)을 허용한다", () => {
    const result = assetFormSchema.safeParse({
      ...base,
      goldGram: "",
    });
    expect(result.success).toBe(true);
  });

  it("goldGram 소수점 7자리 입력은 실패한다", () => {
    const result = assetFormSchema.safeParse({
      ...base,
      goldGram: "0.1234567",
    });
    expect(result.success).toBe(false);
  });

  it("goldGram 음수는 실패한다", () => {
    const result = assetFormSchema.safeParse({
      ...base,
      goldGram: "-1",
    });
    expect(result.success).toBe(false);
  });
});
