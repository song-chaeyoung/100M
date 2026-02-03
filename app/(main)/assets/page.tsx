export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/page-header";
import { getAssets } from "@/app/actions/assets";
import { AssetListClient } from "@/components/assets/asset-list-client";

export default async function AssetsPage() {
  const assets = await getAssets();

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader />
      <AssetListClient assets={assets} />
    </div>
  );
}
