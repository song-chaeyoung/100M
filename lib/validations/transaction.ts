import { z } from "zod";
import type { TransactionType, MethodType } from "@/db/schema";

/**
 * 서버 액션용 스키마 (amount: number, date: string)
 */
export const transactionSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE", "SAVING"]),
    amount: z.number().positive("금액은 0보다 커야 합니다"),
    method: z.enum(["CARD", "CASH"]).optional(),
    date: z.string().min(1, "날짜를 선택하세요"),
    categoryId: z.number().optional(),
    memo: z.string().optional(),
    linkedAssetTransactionId: z.number().optional(),
    isConfirmed: z.boolean().optional().default(true),
  })
  .refine(
    (data) => {
      if (data.type === "INCOME" || data.type === "EXPENSE") {
        return data.categoryId !== undefined;
      }
      return true;
    },
    {
      message: "카테고리를 선택하세요",
      path: ["categoryId"],
    },
  )
  .refine(
    (data) => {
      if (data.type === "INCOME" || data.type === "EXPENSE") {
        return data.method !== undefined;
      }
      return true;
    },
    {
      message: "결제 수단을 선택하세요",
      path: ["method"],
    },
  );

export type TransactionInput = z.infer<typeof transactionSchema>;

/**
 * 폼용 스키마 (amount: string, date: Date)
 */
export const transactionFormSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "SAVING"]),
  amount: z.string().min(1, "금액을 입력하세요"),
  method: z.enum(["CARD", "CASH"]).optional(),
  categoryId: z.number().optional(),
  memo: z.string().optional(),
  date: z.date(),
  isConfirmed: z.boolean(),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

/**
 * 거래 데이터 타입 (조회/수정용, date가 Date 타입)
 */
export interface TransactionData {
  id?: number;
  type: TransactionType;
  amount: string;
  method: MethodType | null;
  categoryId: number | null;
  memo: string;
  date: Date;
  isConfirmed: boolean;
}
