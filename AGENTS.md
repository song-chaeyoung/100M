See @README.md for project overview

# 프로젝트: 일억모으기

App Router, Neon db, Next Auth를 사용하는 Next.js 16 가계부 애플리케이션입니다.

## 코드 스타일

- TypeScript strict 모드 사용, `any` 타입 금지
- default export 대신 named export 사용
- CSS: Tailwind 유틸리티 클래스 사용, 커스텀 CSS 파일 금지

## 명령어

- `bun run dev`: 개발 서버 시작 (포트 3000)
- `bun run lint`: ESLint 검사
- `bun run db:migrate`: Prisma 마이그레이션 실행

## 아키텍처

- `/app`: Next.js App Router 페이지 및 레이아웃
- `/actions`: db와 연결된 api 로직
- `/components/ui`: 재사용 가능한 UI 컴포넌트
- `/lib`: 유틸리티 및 공유 로직
- `/lib/validations`: db 스키마 zod 타입
- `/db`: 데이터베이스 스키마 및 마이그레이션

## 중요 사항

- .env 파일은 절대 커밋하지 마세요
