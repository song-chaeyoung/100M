import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAssetById } from "@/app/actions/assets";
import { getAssetTransactions } from "@/app/actions/asset-transactions";
import { getAssets } from "@/app/actions/assets";
import { AssetDetailClient } from "@/components/assets/asset-detail-client";
import { handleApiResults } from "@/lib/utils/api-handler";
import type { Asset } from "@/lib/validations/asset";
import type { AssetTransaction } from "@/lib/validations/asset-transaction";

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

  // API 호출 및 에러 처리를 유틸리티 함수로 위임
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

  return (
    <AssetDetailClient
      asset={asset}
      transactions={transactions}
      allAssets={allAssets}
      errors={errors.length > 0 ? errors : undefined}
    />
  );
}
