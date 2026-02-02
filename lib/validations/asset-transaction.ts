import { z } from "zod";

export const assetTransactionSchema = z
  .object({
    assetId: z.number().positive("자산을 선택하세요"),
    type: z.enum(["DEPOSIT", "WITHDRAW", "PROFIT", "LOSS", "TRANSFER"]),
    amount: z.number().positive("금액을 입력하세요"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다"),
    memo: z.string().optional(),
    toAssetId: z.number().optional(),
  })
  .refine(
    (data) =>
      data.type !== "TRANSFER" ||
      (data.toAssetId !== undefined && data.toAssetId !== data.assetId),
    {
      message: "이체 대상 자산을 선택하세요",
      path: ["toAssetId"],
    }
  );

export type AssetTransactionInput = z.infer<typeof assetTransactionSchema>;