import { z } from "zod";

// Asset type enum
export const assetTypeSchema = z.enum([
  "SAVINGS",
  "DEPOSIT",
  "STOCK",
  "FUND",
  "CRYPTO",
  "REAL_ESTATE",
  "OTHER",
]);

// Input schema (for forms)
export const assetSchema = z.object({
  name: z.string().min(1, "자산 이름을 입력하세요"),
  type: assetTypeSchema,
  balance: z.number().min(0, "잔액은 0 이상이어야 합니다").default(0),
  institution: z.string().optional(),
  accountNumber: z.string().optional(),
  interestRate: z.number().min(0).max(100).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Response schema (for API responses)
export const assetResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  balance: z.string(),
  institution: z.string().nullable(),
  accountNumber: z.string().nullable(),
  interestRate: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Minimal asset schema (for nested relations)
export const assetMinimalSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
});

export const assetFormSchema = z.object({
  name: z.string().min(1, "자산 이름을 입력하세요"),
  type: z.enum(assetTypeSchema.options, { message: "자산 유형을 선택하세요" }),
  balance: z.string(),
  institution: z.string().optional(),
  accountNumber: z.string().optional(),
  interestRate: z.string().optional(),
});

export type AssetInput = z.infer<typeof assetSchema>;
export type AssetFormValues = z.infer<typeof assetFormSchema>;
export type Asset = z.infer<typeof assetResponseSchema>;
export type AssetMinimal = z.infer<typeof assetMinimalSchema>;
