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
