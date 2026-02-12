import { z } from "zod";

export const goalAmountSchema = z
  .number()
  .positive("금액은 0보다 커야 합니다")
  .finite("유효한 금액을 입력하세요")
  .safe("금액이 너무 큽니다");
