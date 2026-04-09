import { z } from "zod";

export const goldTradeTypeSchema = z.enum(["BUY", "SELL"]);

export const goldTradeInputSchema = z.object({
  assetId: z.number().int().positive("자산 계좌를 선택하세요"),
  type: goldTradeTypeSchema,
  gram: z
    .number()
    .positive("수량(gram)은 0보다 커야 합니다")
    .max(999_999_999.999999, "gram 값이 너무 큽니다"),
  pricePerGram: z
    .number()
    .positive("단가(원/g)는 0보다 커야 합니다")
    .max(9_999_999_999_999.99, "단가 값이 너무 큽니다"),
  tradeDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다"),
  memo: z.string().optional(),
});

export const goldBuyInputSchema = goldTradeInputSchema.extend({
  type: z.literal("BUY"),
});

export const goldSellInputSchema = goldTradeInputSchema.extend({
  type: z.literal("SELL"),
});

export const goldTradeResponseSchema = z.object({
  id: z.number(),
  userId: z.string(),
  assetId: z.number(),
  type: goldTradeTypeSchema,
  gram: z.string(),
  pricePerGram: z.string(),
  amountKrw: z.string(),
  realizedProfit: z.string().nullable(),
  tradeDate: z.string(),
  memo: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const goldPriceSnapshotSchema = z.object({
  pricePerGram: z.number(),
  priceDate: z.string(),
  source: z.string(),
  isStale: z.boolean(),
});

export const goldAssetStatsSchema = z.object({
  assetId: z.number(),
  gram: z.number(),
  avgBuyPrice: z.number(),
  currentPricePerGram: z.number().nullable(),
  priceDate: z.string().nullable(),
  isStale: z.boolean(),
  evalAmount: z.number(),
  totalCost: z.number(),
  unrealizedProfit: z.number(),
  unrealizedProfitRate: z.number().nullable(),
  realizedProfitTotal: z.number(),
});

export const goldBuyFormSchema = z.object({
  gram: z
    .string()
    .min(1, "매수 gram을 입력하세요")
    .refine((value) => /^\d+(\.\d{1,6})?$/.test(value.replace(/,/g, "")), {
      message: "gram은 소수점 6자리까지 입력할 수 있습니다",
    })
    .refine((value) => Number(value.replace(/,/g, "")) > 0, {
      message: "gram은 0보다 커야 합니다",
    }),
  pricePerGram: z
    .string()
    .min(1, "매수 단가를 입력하세요")
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value.replace(/,/g, "")), {
      message: "단가는 소수점 2자리까지 입력할 수 있습니다",
    })
    .refine((value) => Number(value.replace(/,/g, "")) > 0, {
      message: "단가는 0보다 커야 합니다",
    }),
  tradeDate: z.date(),
  memo: z.string().optional(),
});

export const goldSellFormSchema = z.object({
  gram: z
    .string()
    .min(1, "매도 gram을 입력하세요")
    .refine((value) => /^\d+(\.\d{1,6})?$/.test(value.replace(/,/g, "")), {
      message: "gram은 소수점 6자리까지 입력할 수 있습니다",
    })
    .refine((value) => Number(value.replace(/,/g, "")) > 0, {
      message: "gram은 0보다 커야 합니다",
    }),
  pricePerGram: z
    .string()
    .min(1, "매도 단가를 입력하세요")
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value.replace(/,/g, "")), {
      message: "단가는 소수점 2자리까지 입력할 수 있습니다",
    })
    .refine((value) => Number(value.replace(/,/g, "")) > 0, {
      message: "단가는 0보다 커야 합니다",
    }),
  tradeDate: z.date(),
  memo: z.string().optional(),
});

export type GoldTradeInput = z.infer<typeof goldTradeInputSchema>;
export type GoldBuyInput = z.infer<typeof goldBuyInputSchema>;
export type GoldSellInput = z.infer<typeof goldSellInputSchema>;
export type GoldTradeResponse = z.infer<typeof goldTradeResponseSchema>;
export type GoldPriceSnapshot = z.infer<typeof goldPriceSnapshotSchema>;
export type GoldAssetStats = z.infer<typeof goldAssetStatsSchema>;
export type GoldBuyFormValues = z.infer<typeof goldBuyFormSchema>;
export type GoldSellFormValues = z.infer<typeof goldSellFormSchema>;
