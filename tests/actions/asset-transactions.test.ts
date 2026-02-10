import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// Mock 설정
//
// auth.test.ts와 같은 원리지만, 이번엔 인증 이후 단계까지 테스트하므로:
// 1. drizzle-orm 함수들도 mock (mock 스키마가 문자열이라 진짜 함수는 에러남)
// 2. limit, batch의 반환값을 테스트마다 다르게 설정
// ============================================================

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

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
    returning: vi.fn().mockReturnThis(), // batch에 전달될 쿼리 객체로 사용됨
    limit: vi.fn().mockResolvedValue([]),
    orderBy: vi.fn().mockResolvedValue([]),
    leftJoin: vi.fn().mockReturnThis(),
    batch: vi.fn().mockResolvedValue([[]]),
  },
}));

vi.mock("@/db/schema", () => ({
  assets: {
    id: "id",
    userId: "userId",
    balance: "balance",
    name: "name",
    type: "type",
    icon: "icon",
    color: "color",
    updatedAt: "updatedAt",
  },
  assetTransactions: {
    id: "id",
    userId: "userId",
    assetId: "assetId",
    type: "type",
    amount: "amount",
    date: "date",
    memo: "memo",
    isFixed: "isFixed",
    fixedSavingId: "fixedSavingId",
    toAssetId: "toAssetId",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// drizzle-orm 함수 mock
// mock 스키마 필드가 문자열("id" 등)이라 진짜 eq/and/sql은 Column 타입을 기대해서 에러남
// → 가짜 함수로 대체. DB 메서드가 전부 mock이라 인자값은 무시됨
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  lte: vi.fn(),
  sql: vi.fn(), // tagged template literal로 호출돼도 vi.fn()이 함수라 에러 안 남
}));

import { auth } from "@/auth";
import { db } from "@/db";
import { getBalanceOperation } from "@/lib/utils/asset-transaction";
import {
  createAssetTransaction,
  updateAssetTransaction,
  deleteAssetTransaction,
} from "@/app/actions/asset-transactions";

// 타입 캐스팅: mock 메서드(.mockResolvedValueOnce 등)를 쓰려면 필요
const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockDb = db as unknown as Record<string, ReturnType<typeof vi.fn>>;

// ============================================================
// 1. 잔액 계산 테스트 — 순수 함수, mock 불필요
// ============================================================
describe("getBalanceOperation", () => {
  it("DEPOSIT → add (잔액 증가)", () => {
    expect(getBalanceOperation("DEPOSIT")).toBe("add");
  });

  it("PROFIT → add (잔액 증가)", () => {
    expect(getBalanceOperation("PROFIT")).toBe("add");
  });

  it("WITHDRAW → subtract (잔액 감소)", () => {
    expect(getBalanceOperation("WITHDRAW")).toBe("subtract");
  });

  it("LOSS → subtract (잔액 감소)", () => {
    expect(getBalanceOperation("LOSS")).toBe("subtract");
  });

  it("TRANSFER → subtract (출금 자산 기준)", () => {
    expect(getBalanceOperation("TRANSFER")).toBe("subtract");
  });
});

// ============================================================
// 2. createAssetTransaction — 성공/실패 흐름
// ============================================================
describe("createAssetTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("인증된 사용자 + 유효한 데이터 → 거래 생성 성공", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    // limit(1): 자산 소유권 확인 → 자산이 존재함
    mockDb.limit.mockResolvedValueOnce([{ id: 1, userId: "user-1" }]);

    // batch: [insertQuery, fromBalanceQuery] → 첫 번째 배열이 insert 결과
    mockDb.batch.mockResolvedValueOnce([
      [{ id: 10, type: "DEPOSIT", amount: "100000" }],
    ]);

    const result = await createAssetTransaction({
      assetId: 1,
      type: "DEPOSIT",
      amount: 100000,
      date: "2025-06-15",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      id: 10,
      type: "DEPOSIT",
      amount: "100000",
    });
  });

  it("존재하지 않는 자산 → '자산이 존재하지 않습니다.' 에러", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    // limit(1): 빈 배열 = 자산 없음
    mockDb.limit.mockResolvedValueOnce([]);

    const result = await createAssetTransaction({
      assetId: 999,
      type: "DEPOSIT",
      amount: 100000,
      date: "2025-06-15",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("자산이 존재하지 않습니다.");
  });

  it("유효하지 않은 데이터 → validation 에러 반환", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const result = await createAssetTransaction({
      assetId: 1,
      type: "DEPOSIT",
      amount: -1000, // 음수 금액
      date: "2025-06-15",
    });

    expect(result.success).toBe(false);
    // zod fieldErrors 객체가 반환됨
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe("object");
  });

  it("TRANSFER: 이체 대상 자산이 없으면 실패", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    // 첫 번째 limit: 출금 자산 존재
    mockDb.limit
      .mockResolvedValueOnce([{ id: 1, userId: "user-1" }])
      // 두 번째 limit: 이체 대상 자산 없음
      .mockResolvedValueOnce([]);

    const result = await createAssetTransaction({
      assetId: 1,
      type: "TRANSFER",
      amount: 50000,
      date: "2025-06-15",
      toAssetId: 2,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("이체 대상 자산이 존재하지 않습니다.");
  });

  it("TRANSFER: 양쪽 자산 모두 존재하면 성공", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    // 첫 번째 limit: 출금 자산 존재
    mockDb.limit
      .mockResolvedValueOnce([{ id: 1, userId: "user-1" }])
      // 두 번째 limit: 입금 자산 존재
      .mockResolvedValueOnce([{ id: 2, userId: "user-1" }]);

    // batch: TRANSFER는 3개 쿼리 [insert, fromBalance, toBalance]
    mockDb.batch.mockResolvedValueOnce([
      [{ id: 10, type: "TRANSFER", amount: "50000" }],
    ]);

    const result = await createAssetTransaction({
      assetId: 1,
      type: "TRANSFER",
      amount: 50000,
      date: "2025-06-15",
      toAssetId: 2,
    });

    expect(result.success).toBe(true);
  });
});

// ============================================================
// 3. updateAssetTransaction — 수정 흐름 + 예외 처리
// ============================================================
describe("updateAssetTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("존재하지 않는 거래 수정 시도 → 에러", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    // limit(1): 거래 없음
    mockDb.limit.mockResolvedValueOnce([]);

    const result = await updateAssetTransaction(999, {
      amount: 200000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("거래 내역이 존재하지 않습니다.");
  });

  it("고정 저축 거래 수정 시도 → 수정 불가 에러", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    // limit(1): 고정 저축 거래가 존재
    mockDb.limit.mockResolvedValueOnce([
      {
        id: 1,
        userId: "user-1",
        assetId: 1,
        type: "DEPOSIT",
        amount: "100000",
        isFixed: true, // ← 핵심: 고정 저축
        toAssetId: null,
      },
    ]);

    const result = await updateAssetTransaction(1, {
      amount: 200000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "고정 저축에서 생성된 거래는 수정할 수 없습니다.",
    );
  });

  it("일반 거래 수정 → 성공", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    // limit(1): 기존 거래 (비고정, 비이체)
    mockDb.limit.mockResolvedValueOnce([
      {
        id: 1,
        userId: "user-1",
        assetId: 1,
        type: "DEPOSIT",
        amount: "100000",
        isFixed: false,
        toAssetId: null,
      },
    ]);

    // batch 반환값 구조 (비이체):
    // [0] 기존 잔액 역연산 결과
    // [1] 거래 수정 returning (returningIndex = 1)
    // [2] 새 잔액 적용 결과
    mockDb.batch.mockResolvedValueOnce([
      [],
      [{ id: 1, amount: "200000", type: "DEPOSIT" }],
      [],
    ]);

    const result = await updateAssetTransaction(1, {
      amount: 200000,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      id: 1,
      amount: "200000",
      type: "DEPOSIT",
    });
  });
});

// ============================================================
// 4. deleteAssetTransaction — 삭제 흐름 + 예외 처리
// ============================================================
describe("deleteAssetTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("존재하지 않는 거래 삭제 시도 → 에러", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    mockDb.limit.mockResolvedValueOnce([]);

    const result = await deleteAssetTransaction(999);

    expect(result.success).toBe(false);
    expect(result.error).toBe("거래 내역이 존재하지 않습니다.");
  });

  it("고정 저축 거래 삭제 시도 → 삭제 불가 에러", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    mockDb.limit.mockResolvedValueOnce([
      {
        id: 1,
        userId: "user-1",
        assetId: 1,
        type: "DEPOSIT",
        amount: "100000",
        isFixed: true,
        toAssetId: null,
      },
    ]);

    const result = await deleteAssetTransaction(1);

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "고정 저축에서 생성된 거래는 삭제할 수 없습니다.",
    );
  });

  it("일반 거래 삭제 → 성공", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    mockDb.limit.mockResolvedValueOnce([
      {
        id: 1,
        userId: "user-1",
        assetId: 1,
        type: "DEPOSIT",
        amount: "100000",
        isFixed: false,
        toAssetId: null,
      },
    ]);

    // batch: [역연산, 삭제] — 결과는 사용 안 함
    mockDb.batch.mockResolvedValueOnce([[], []]);

    const result = await deleteAssetTransaction(1);

    expect(result.success).toBe(true);
  });
});
