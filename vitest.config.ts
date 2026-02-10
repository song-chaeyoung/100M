import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // 테스트 파일 패턴: tests 폴더 안의 .test.ts 파일
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // tsconfig의 @/* 경로 별칭을 vitest에서도 사용
      "@": path.resolve(__dirname, "."),
    },
  },
});
