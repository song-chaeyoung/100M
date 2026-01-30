import { z } from "zod";

export const fixedExpenseSchema = z.object({
  title: z.string().min(1, "이름을 입력하세요"),
  amount: z.number().positive("금액은 0보다 커야 합니다"),
  scheduledDay: z.number().min(1, "1 이상이어야 합니다").max(31, "31 이하여야 합니다"),
  type: z.enum(["FIXED", "ETC"]),
  categoryId: z.number({ error: "카테고리를 선택하세요" }),
  method: z.enum(["CARD", "CASH"]),
});

export type FixedExpenseInput = z.infer<typeof fixedExpenseSchema>;
