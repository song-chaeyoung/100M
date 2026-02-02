import { z } from "zod";

export const assetSchema = z.object({
  name: z.string().min(1, "자산 이름을 입력하세요"),
  type: z.enum(
    ["SAVINGS", "DEPOSIT", "STOCK", "FUND", "CRYPTO", "REAL_ESTATE", "OTHER"],
    { message: "자산 유형을 선택하세요" }
  ),
  balance: z.number().min(0, "잔액은 0 이상이어야 합니다").default(0),
  institution: z.string().optional(),
  accountNumber: z.string().optional(),
  interestRate: z.number().min(0).max(100).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type AssetInput = z.infer<typeof assetSchema>;
