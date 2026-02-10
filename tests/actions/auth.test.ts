import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// vi.mock: "가짜 모듈"을 만드는 기능
//
// Server Action은 auth(), db, revalidatePath 같은 외부 의존성이 있음
// 테스트할 때 진짜 DB에 연결하거나 진짜 로그인할 수 없으니
// 이것들을 "가짜"로 대체하는 것 = 모킹(mocking)
// ============================================================

// 1) auth 모듈을 가짜로 대체
vi.mock("@/auth", () => ({
  auth: vi.fn(), // vi.fn() = 호출 기록을 추적하는 가짜 함수
}));

// 2) DB 모듈을 가짜로 대체 (실제 DB 연결 방지)
vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    limit: vi.fn().mockResolvedValue([]),
    orderBy: vi.fn().mockResolvedValue([]),
    leftJoin: vi.fn().mockReturnThis(),
    batch: vi.fn().mockResolvedValue([[]]),
  },
}));

// 3) DB 스키마 모듈을 가짜로 대체
vi.mock("@/db/schema", () => ({
  transactions: { id: "id", userId: "userId", date: "date", type: "type" },
  categories: { id: "id" },
  assets: { id: "id", userId: "userId", balance: "balance" },
  assetTransactions: { id: "id", userId: "userId", date: "date" },
}));

// 4) Next.js의 revalidatePath를 가짜로 대체
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// 모킹한 auth를 import해서 테스트에서 제어
import { auth } from "@/auth";
import {
  getTransactionsByMonth,
  createTransaction,
} from "@/app/actions/transactions";
import {
  createAssetTransaction,
  getAssetTransactions,
} from "@/app/actions/asset-transactions";

// 타입 캐스팅: vi.fn()의 메서드(.mockResolvedValue 등)를 쓰려면 필요
const mockAuth = auth as ReturnType<typeof vi.fn>;

describe("Server Action 인증 검증", () => {
  // 각 테스트 전에 mock 상태를 초기화
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // === 핵심: 로그인 안 했을 때 모든 action이 거부되는지 ===

  it("인증 없이 getTransactionsByMonth 호출하면 실패한다", async () => {
    // auth()가 null을 반환하도록 설정 = 로그인 안 한 상태
    mockAuth.mockResolvedValue(null);

    const result = await getTransactionsByMonth("2025-06");

    expect(result.success).toBe(false);
    expect(result.error).toBe("인증이 필요합니다.");
  });

  it("인증 없이 createTransaction 호출하면 실패한다", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await createTransaction({
      type: "INCOME",
      amount: 50000,
      method: "CARD",
      date: "2025-06-15",
      categoryId: 1,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("인증이 필요합니다.");
  });

  it("인증 없이 getAssetTransactions 호출하면 실패한다", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getAssetTransactions();

    expect(result.success).toBe(false);
    expect(result.error).toBe("인증이 필요합니다.");
  });

  it("인증 없이 createAssetTransaction 호출하면 실패한다", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await createAssetTransaction({
      assetId: 1,
      type: "DEPOSIT",
      amount: 100000,
      date: "2025-06-15",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("인증이 필요합니다.");
  });

  // === session은 있지만 user.id가 없는 경우 ===

  it("session은 있지만 user.id가 없으면 실패한다", async () => {
    // session 객체는 있지만 user.id가 undefined
    mockAuth.mockResolvedValue({ user: {} });

    const result = await getTransactionsByMonth("2025-06");

    expect(result.success).toBe(false);
    expect(result.error).toBe("인증이 필요합니다.");
  });
});
