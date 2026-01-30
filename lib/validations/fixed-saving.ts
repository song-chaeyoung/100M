import { z } from "zod";

export const fixedSavingSchema = z.object({
  title: z.string().min(1, "이름을 입력하세요"),
  amount: z.number().positive("금액은 0보다 커야 합니다"),
  scheduledDay: z.number().min(1, "1 이상이어야 합니다").max(31, "31 이하여야 합니다"),
  assetId: z.number().positive("저축 계좌를 선택해주세요"),
  startDate: z.string().regex(/^\d{4}-\d{2}$/, "YYYY-MM 형식이어야 합니다"),
  endDate: z.string().regex(/^\d{4}-\d{2}$/, "YYYY-MM 형식이어야 합니다"),
});

export type FixedSavingInput = z.infer<typeof fixedSavingSchema>;
