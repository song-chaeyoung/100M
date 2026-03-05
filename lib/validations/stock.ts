import { z } from "zod";

// ─────────────────────────────────────────────
// 검색 결과 타입
// ─────────────────────────────────────────────

export const stockSearchResultSchema = z.object({
  stockCode: z.string(),
  stockName: z.string(),
  stockNameEn: z.string().nullable(),
  market: z.string(), // KOSPI, KOSDAQ, NYSE, NASDAQ, AMEX
  country: z.string(), // KR, US
});

export type StockSearchResult = z.infer<typeof stockSearchResultSchema>;

// ─────────────────────────────────────────────
// 보유내역 폼 스키마 (react-hook-form 용)
// ─────────────────────────────────────────────

export const stockHoldingFormSchema = z.object({
  assetId: z.number({ error: "자산 계좌를 선택하세요." }),

  // 자동완성으로 채워지는 필드 (읽기 전용)
  stockCode: z.string().min(1, "종목을 검색하여 선택하세요."),
  stockName: z.string().min(1),
  country: z.enum(["KR", "US"]),
  market: z.string(),

  // 사용자 직접 입력
  quantity: z
    .string()
    .min(1, "수량을 입력하세요.")
    .refine(
      (v) => {
        const n = Number(v.replace(/,/g, ""));
        return !isNaN(n) && n > 0;
      },
      { message: "수량은 0보다 커야 합니다." },
    ),
  avgPrice: z
    .string()
    .min(1, "평단가를 입력하세요.")
    .refine((v) => Number(v) > 0, {
      message: "평단가는 0 초과여야 합니다.",
    }),

  memo: z.string().optional(),

  // 가계부 저축 연동
  recordAsSaving: z.boolean(),
  investmentKRW: z.string().optional(), // 원화 환산 투자금액 (recordAsSaving=true 시 입력)
  purchaseDate: z.string(), // 거래 날짜
});

export type StockHoldingFormValues = z.infer<typeof stockHoldingFormSchema>;

// ─────────────────────────────────────────────
// DB 응답 타입
// ─────────────────────────────────────────────

export const stockHoldingResponseSchema = z.object({
  id: z.number(),
  userId: z.string(),
  assetId: z.number(),
  stockCode: z.string(),
  stockName: z.string(),
  country: z.string(),
  quantity: z.coerce.number().positive(), // decimal DB 반환값 파싱
  avgPrice: z.string(),
  currency: z.string(),
  memo: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const stockPriceResponseSchema = z.object({
  id: z.number(),
  stockCode: z.string(),
  stockName: z.string(),
  market: z.string(),
  country: z.string(),
  currentPrice: z.string(),
  previousClose: z.string().nullable(),
  changeRate: z.string().nullable(),
  currency: z.string(),
  krwPrice: z.string().nullable(),
  exchangeRate: z.string().nullable(),
  priceDate: z.string(),
  updatedAt: z.coerce.date(),
});

export type StockHoldingResponse = z.infer<typeof stockHoldingResponseSchema>;
export type StockPriceResponse = z.infer<typeof stockPriceResponseSchema>;

// ─────────────────────────────────────────────
// 보유내역 Server Actions 스키마
// ─────────────────────────────────────────────

export const createStockHoldingSchema = z.object({
  assetId: z.number().int().positive("자산 계좌를 선택하세요."),
  stockCode: z.string().min(1, "종목 코드를 입력하세요."),
  stockName: z.string().min(1, "종목명을 입력하세요."),
  country: z.enum(["KR", "US"]).default("KR"),
  market: z.string().default("KOSPI"),
  quantity: z.number().positive("수량은 0보다 커야 합니다."),
  avgPrice: z.number().positive("평단가는 0 초과여야 합니다.").multipleOf(0.01),
  currency: z.enum(["KRW", "USD"]).default("KRW"),
  memo: z.string().optional(),
  // 가계부 저축 연동
  recordAsSaving: z.boolean().default(false),
  investmentKRW: z.number().positive().optional(),
  purchaseDate: z.string().optional(),
});
export type CreateStockHoldingInput = z.infer<typeof createStockHoldingSchema>;

export const updateStockHoldingSchema = createStockHoldingSchema.partial();
export type UpdateStockHoldingInput = z.infer<typeof updateStockHoldingSchema>;

export const buyMoreStockHoldingSchema = z.object({
  holdingId: z.number().int().positive(),
  quantity: z.number().positive("수량은 0보다 커야 합니다."),
  buyPrice: z.number().positive("매수가는 0 초과여야 합니다."),
  investmentKRW: z.number().positive("투자금액을 입력하세요."),
  purchaseDate: z.string(),
});
export type BuyMoreStockHoldingInput = z.infer<
  typeof buyMoreStockHoldingSchema
>;

export const sellPartialStockHoldingSchema = z.object({
  holdingId: z.number().int().positive(),
  quantity: z.number().positive("매도 수량은 0보다 커야 합니다."),
  sellPrice: z.number().positive("매도가는 0 초과여야 합니다."),
  proceedsKRW: z.number().positive("매도 대금을 입력하세요."),
  sellDate: z.string(),
});
export type SellPartialStockHoldingInput = z.infer<
  typeof sellPartialStockHoldingSchema
>;

// ─────────────────────────────────────────────
// 기타 폼 스키마 (추매, 분할매도)
// ─────────────────────────────────────────────

export const buyMoreFormSchema = z.object({
  quantity: z
    .string()
    .min(1, "수량을 입력하세요.")
    .refine(
      (v) => {
        const n = Number(v.replace(/,/g, ""));
        return !isNaN(n) && n > 0;
      },
      { message: "수량은 0보다 커야 합니다." },
    ),
  buyPrice: z
    .string()
    .min(1, "매수가를 입력하세요.")
    .refine((v) => Number(v.replace(/,/g, "")) > 0, {
      message: "매수가는 0 초과여야 합니다.",
    }),
  investmentKRW: z.string().min(1, "투자금액을 입력하세요."),
  purchaseDate: z.date(),
});
export type BuyMoreFormValues = z.infer<typeof buyMoreFormSchema>;

export const sellPartialFormSchema = z.object({
  quantity: z
    .string()
    .min(1, "수량을 입력하세요.")
    .refine(
      (v) => {
        const n = Number(v.replace(/,/g, ""));
        return !isNaN(n) && n > 0;
      },
      { message: "수량은 0보다 커야 합니다." },
    ),
  sellPrice: z
    .string()
    .min(1, "매도가를 입력하세요.")
    .refine((v) => Number(v.replace(/,/g, "")) > 0, {
      message: "매도가는 0 초과여야 합니다.",
    }),
  proceedsKRW: z.string().min(1, "매도 대금을 입력하세요."),
  sellDate: z.date(),
});
export type SellPartialFormValues = z.infer<typeof sellPartialFormSchema>;
