import { z } from "zod";
import { assetMinimalSchema } from "./asset";

// Transaction type enum
export const assetTransactionTypeSchema = z.enum([
  "DEPOSIT",
  "WITHDRAW",
  "PROFIT",
  "LOSS",
  "TRANSFER",
]);

// Input schema (for forms)
export const assetTransactionSchema = z
  .object({
    assetId: z.number().positive("자산을 선택하세요"),
    type: assetTransactionTypeSchema,
    amount: z.number().positive("금액을 입력하세요"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다"),
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

// Response schema (for API responses)
export const assetTransactionResponseSchema = z.object({
  id: z.number(),
  assetId: z.number(),
  type: assetTransactionTypeSchema,
  amount: z.string(),
  date: z.string(),
  memo: z.string().nullable(),
  isFixed: z.boolean(),
  fixedSavingId: z.number().nullable(),
  toAssetId: z.number().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  asset: assetMinimalSchema.nullable(),
});

export type AssetTransactionInput = z.infer<typeof assetTransactionSchema>;
export type AssetTransaction = z.infer<typeof assetTransactionResponseSchema>;