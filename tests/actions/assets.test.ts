import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/db/schema", () => ({
  assets: {
    id: "id",
    userId: "userId",
    type: "type",
    name: "name",
    balance: "balance",
    goldGram: "goldGram",
    goldAvgBuyPrice: "goldAvgBuyPrice",
    institution: "institution",
    accountNumber: "accountNumber",
    interestRate: "interestRate",
    icon: "icon",
    color: "color",
    isActive: "isActive",
    updatedAt: "updatedAt",
  },
  goldTrades: {
    id: "id",
    userId: "userId",
    assetId: "assetId",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  not: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/app/actions/gold", () => ({
  syncGoldAssetBalance: vi.fn(),
}));

import { auth } from "@/auth";
import { db } from "@/db";
import { revalidatePath } from "next/cache";
import { syncGoldAssetBalance } from "@/app/actions/gold";
import { createAsset, updateAsset } from "@/app/actions/assets";

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockDb = db as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockRevalidatePath = revalidatePath as unknown as ReturnType<typeof vi.fn>;
const mockSyncGoldAssetBalance = syncGoldAssetBalance as unknown as ReturnType<
  typeof vi.fn
>;

describe("assets actions - GOLD guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("createAsset(GOLD) always persists zeroed gold fields and runs sync", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: 101 }]);

    const result = await createAsset({
      name: "gold-account",
      type: "GOLD",
      balance: 999999,
      goldGram: 3.75,
      goldAvgBuyPrice: 228210,
      institution: "bank",
      accountNumber: "110-xxx-xxxxxx",
      isActive: true,
    });

    expect(result.success).toBe(true);
    expect(mockDb.values).toHaveBeenCalledTimes(1);
    const insertPayload = mockDb.values.mock.calls[0][0];
    expect(insertPayload.balance).toBe("0");
    expect(insertPayload.goldGram).toBe("0.000000");
    expect(insertPayload.goldAvgBuyPrice).toBe("0.00");
    expect(mockSyncGoldAssetBalance).toHaveBeenCalledWith(101, "user-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
  });

  it("updateAsset(existing GOLD) does not zero out holdings on metadata edit", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: 1,
        userId: "user-1",
        type: "GOLD",
      },
    ]);
    mockDb.returning.mockResolvedValueOnce([{ id: 1 }]);

    const result = await updateAsset(1, {
      name: "gold-account-updated",
      balance: 123456,
      goldGram: 12.5,
      goldAvgBuyPrice: 100000,
    });

    expect(result.success).toBe(true);
    expect(mockDb.set).toHaveBeenCalledTimes(1);
    const updatePayload = mockDb.set.mock.calls[0][0];
    expect(updatePayload.name).toBe("gold-account-updated");
    expect(updatePayload.balance).toBeUndefined();
    expect(updatePayload.goldGram).toBeUndefined();
    expect(updatePayload.goldAvgBuyPrice).toBeUndefined();
    expect(mockSyncGoldAssetBalance).toHaveBeenCalledWith(1, "user-1");
  });

  it("updateAsset(type -> GOLD) zeroes gold fields and runs sync", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: 1,
        userId: "user-1",
        type: "SAVINGS",
      },
    ]);
    mockDb.returning.mockResolvedValueOnce([{ id: 1 }]);

    const result = await updateAsset(1, {
      type: "GOLD",
      balance: 777777,
      goldGram: 9.9,
      goldAvgBuyPrice: 200000,
    });

    expect(result.success).toBe(true);
    const updatePayload = mockDb.set.mock.calls[0][0];
    expect(updatePayload.type).toBe("GOLD");
    expect(updatePayload.balance).toBe("0");
    expect(updatePayload.goldGram).toBe("0.000000");
    expect(updatePayload.goldAvgBuyPrice).toBe("0.00");
    expect(mockSyncGoldAssetBalance).toHaveBeenCalledWith(1, "user-1");
  });

  it("updateAsset(GOLD -> non-GOLD) applies provided balance", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: 1,
        userId: "user-1",
        type: "GOLD",
      },
    ]);
    mockDb.returning.mockResolvedValueOnce([{ id: 1 }]);

    const result = await updateAsset(1, {
      type: "CHECKING",
      balance: 555000,
    });

    expect(result.success).toBe(true);
    const updatePayload = mockDb.set.mock.calls[0][0];
    expect(updatePayload.type).toBe("CHECKING");
    expect(updatePayload.balance).toBe("555000");
    expect(updatePayload.goldGram).toBe("0.000000");
    expect(updatePayload.goldAvgBuyPrice).toBe("0.00");
    expect(mockDb.limit).toHaveBeenCalledTimes(2);
    expect(mockSyncGoldAssetBalance).not.toHaveBeenCalled();
  });

  it("updateAsset blocks GOLD -> non-GOLD when trade history exists", async () => {
    mockDb.limit
      .mockResolvedValueOnce([
        {
          id: 1,
          userId: "user-1",
          type: "GOLD",
        },
      ])
      .mockResolvedValueOnce([{ id: 99 }]);

    const result = await updateAsset(1, {
      type: "CHECKING",
      balance: 555000,
    });

    expect(result.success).toBe(false);
    if (!result.success && typeof result.error === "string") {
      expect(result.error).toContain("금 거래 이력");
    }
    expect(mockDb.update).not.toHaveBeenCalled();
    expect(mockSyncGoldAssetBalance).not.toHaveBeenCalled();
  });
});
