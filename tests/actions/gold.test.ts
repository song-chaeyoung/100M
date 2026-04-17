import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/db/schema", () => ({
  goldPrices: {
    pricePerGram: "pricePerGram",
    priceDate: "priceDate",
    source: "source",
    updatedAt: "updatedAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  desc: vi.fn(),
  eq: vi.fn(),
  isNull: vi.fn(),
  sql: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/krx-gold", () => ({
  fetchKRXGoldPrice: vi.fn(),
}));

import { auth } from "@/auth";
import { db } from "@/db";
import { fetchKRXGoldPrice } from "@/lib/krx-gold";
import { getLatestGoldPriceWithFallback } from "@/app/actions/gold";

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockDb = db as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockFetchKRXGoldPrice = fetchKRXGoldPrice as unknown as ReturnType<
  typeof vi.fn
>;

describe("getLatestGoldPriceWithFallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("KRX 조회 실패 시 최근 캐시 시세로 폴백한다", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFetchKRXGoldPrice.mockRejectedValue(new Error("network error"));
    mockDb.limit.mockResolvedValueOnce([
      {
        pricePerGram: "143210.55",
        priceDate: "2026-04-07",
        source: "KRX_OPEN_API",
      },
    ]);

    const result = await getLatestGoldPriceWithFallback();

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.pricePerGram).toBe(143210.55);
    expect(result.data.priceDate).toBe("2026-04-07");
    expect(result.data.isStale).toBe(true);
  });

  it("캐시도 없으면 실패를 반환한다", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockFetchKRXGoldPrice.mockRejectedValue(new Error("network error"));
    mockDb.limit.mockResolvedValueOnce([]);

    const result = await getLatestGoldPriceWithFallback();

    expect(result.success).toBe(false);
  });
});
