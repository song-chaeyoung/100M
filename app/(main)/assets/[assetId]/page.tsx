import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getAssetById } from "@/app/actions/assets";
import { getAssetTransactions } from "@/app/actions/asset-transactions";
import { getAssets } from "@/app/actions/assets";
import { AssetDetailClient } from "@/components/assets/asset-detail-client";

interface AssetDetailPageProps {
  params: Promise<{ assetId: string }>;
}

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { assetId } = await params;
  const assetIdNum = parseInt(assetId, 10);

  if (isNaN(assetIdNum)) {
    notFound();
  }

  const [asset, transactions, allAssets] = await Promise.all([
    getAssetById(assetIdNum),
    getAssetTransactions(assetIdNum),
    getAssets(),
  ]);

  if (!asset) {
    notFound();
  }

  return (
    <AssetDetailClient
      asset={asset}
      transactions={transactions}
      allAssets={allAssets}
    />
  );
}
