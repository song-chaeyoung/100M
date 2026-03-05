import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAssetById } from "@/app/actions/assets";
import { getAssetTransactions } from "@/app/actions/asset-transactions";
import { getAssets } from "@/app/actions/assets";
import {
  getStockHoldingsByAsset,
  getStockPricesForAsset,
} from "@/app/actions/stocks";
import { AssetDetailClient } from "@/components/assets/asset-detail-client";
import { handleApiResults } from "@/lib/utils/api-handler";
import type { Asset } from "@/lib/validations/asset";
import type { AssetTransaction } from "@/lib/validations/asset-transaction";
import type { StockPriceResponse } from "@/lib/validations/stock";
import { stockHoldingResponseSchema } from "@/lib/validations/stock";
import type { StockHoldingResponse } from "@/lib/validations/stock";

export const metadata: Metadata = {
  title: "자산 상세",
};

interface AssetDetailPageProps {
  params: Promise<{ assetId: string }>;
}

export default async function AssetDetailPage({
  params,
}: AssetDetailPageProps) {
  const { assetId } = await params;
  const assetIdNum = parseInt(assetId, 10);

  if (isNaN(assetIdNum)) {
    notFound();
  }

  const { data, errors } = await handleApiResults<
    [Asset | null, AssetTransaction[], Asset[]]
  >([getAssetById(assetIdNum), getAssetTransactions(assetIdNum), getAssets()], {
    fallbacks: [null, [], []],
    errorMessages: [
      "자산 정보 조회 중 오류가 발생했습니다.",
      "거래 내역 조회 중 오류가 발생했습니다.",
      "자산 목록 조회 중 오류가 발생했습니다.",
    ],
  });

  const [asset, transactions, allAssets] = data;

  // STOCK 타입일 때만 주식 데이터 추가 페칭
  let stockHoldings: StockHoldingResponse[] = [];
  let stockPrices: StockPriceResponse[] = [];
  let cashBalance = 0;

  if (asset?.type === "STOCK") {
    const [holdingsResult, pricesResult] = await Promise.allSettled([
      getStockHoldingsByAsset(assetIdNum),
      getStockPricesForAsset(assetIdNum),
    ]);

    if (
      holdingsResult.status === "fulfilled" &&
      holdingsResult.value?.success
    ) {
      stockHoldings = stockHoldingResponseSchema
        .array()
        .parse(holdingsResult.value.data ?? []);
    }
    if (pricesResult.status === "fulfilled" && pricesResult.value?.success) {
      stockPrices = (pricesResult.value.data ?? []) as StockPriceResponse[];
    }

    // cashBalance: asset.cashBalance (서버에서 이미 조회됨)
    cashBalance = Number(asset?.cashBalance ?? 0);
  }

  return (
    <AssetDetailClient
      asset={asset}
      transactions={transactions}
      allAssets={allAssets}
      stockHoldings={stockHoldings}
      stockPrices={stockPrices}
      cashBalance={cashBalance}
      errors={errors.length > 0 ? errors : undefined}
    />
  );
}
