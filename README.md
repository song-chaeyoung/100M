# 일억모으기 (100M) 💰

Next.js 14 기반 가계부 애플리케이션

## 🚀 시작하기

## 📦 주요 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Neon PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: NextAuth.js
- **State Management**: Zustand
- **Icons**: Lucide React

## 🗄️ 데이터베이스 스크립트

```bash
# 마이그레이션 파일 생성
bun run db:generate

# 마이그레이션 실행
bun run db:migrate

# 스키마를 DB에 직접 푸시 (개발용)
bun run db:push

# Drizzle Studio 실행 (DB GUI)
bun run db:studio

# 시드 데이터 삽입
bun run db:seed
```

## 📁 프로젝트 구조

```
100m/
├── app/              # Next.js App Router
├── components/       # 재사용 가능한 컴포넌트
├── db/              # 데이터베이스 스키마 및 설정
│   ├── schema.ts    # Drizzle 스키마 정의
│   ├── index.ts     # DB 연결
│   └── seed.ts      # 시드 데이터
├── lib/             # 유틸리티 함수
└── stores/          # Zustand 스토어
```
