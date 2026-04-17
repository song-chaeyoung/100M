import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  getAssetById: vi.fn(),
  getAssets: vi.fn(),
  getAssetTransactions: vi.fn(),
  getStockHoldingsByAsset: vi.fn(),
  getStockPricesForAsset: vi.fn(),
  getGoldTradesByAsset: vi.fn(),
  getLatestGoldPriceWithFallback: vi.fn(),
  getGoldRealizedProfitTotal: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: mocked.notFound,
}));

vi.mock("@/app/actions/assets", () => ({
  getAssetById: mocked.getAssetById,
  getAssets: mocked.getAssets,
}));

vi.mock("@/app/actions/asset-transactions", () => ({
  getAssetTransactions: mocked.getAssetTransactions,
}));

vi.mock("@/app/actions/stocks", () => ({
  getStockHoldingsByAsset: mocked.getStockHoldingsByAsset,
  getStockPricesForAsset: mocked.getStockPricesForAsset,
}));

vi.mock("@/app/actions/gold", () => ({
  getGoldTradesByAsset: mocked.getGoldTradesByAsset,
  getLatestGoldPriceWithFallback: mocked.getLatestGoldPriceWithFallback,
  getGoldRealizedProfitTotal: mocked.getGoldRealizedProfitTotal,
}));

vi.mock("@/components/assets/asset-detail-client", () => ({
  AssetDetailClient: () => null,
}));

describe("AssetDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocked.getAssetById.mockResolvedValue({
      success: true,
      data: {
        id: 1,
        name: "gold",
        type: "GOLD",
        balance: "0",
        cashBalance: "0",
        goldGram: "0",
        goldAvgBuyPrice: "0",
        institution: null,
        accountNumber: null,
        interestRate: null,
        icon: null,
        color: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    mocked.getAssetTransactions.mockResolvedValue({ success: true, data: [] });
    mocked.getAssets.mockResolvedValue({ success: true, data: [] });
    mocked.getGoldTradesByAsset.mockResolvedValue({ success: true, data: [] });
    mocked.getLatestGoldPriceWithFallback.mockResolvedValue({
      success: true,
      data: null,
    });
    mocked.getGoldRealizedProfitTotal.mockResolvedValue({
      success: true,
      data: 0,
    });
  });

  it("가격 응답 data가 null이어도 예외 없이 렌더링된다", async () => {
    const pageModule = await import("@/app/(main)/assets/[assetId]/page");

    await expect(
      pageModule.default({ params: Promise.resolve({ assetId: "1" }) }),
    ).resolves.toBeDefined();

    expect(mocked.getLatestGoldPriceWithFallback).toHaveBeenCalledTimes(1);
    expect(mocked.notFound).not.toHaveBeenCalled();
  });
});
