import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getAssets } from "@/app/actions/assets";
import { AssetListClient } from "@/components/assets/asset-list-client";
import { handleApiResults } from "@/lib/utils/api-handler";
import { ErrorToast } from "@/components/error-toast";
import type { Asset } from "@/lib/validations/asset";

export const metadata: Metadata = {
  title: "자산",
};

export default async function AssetsPage() {
  const { data, errors } = await handleApiResults<[Asset[]]>([getAssets()], {
    fallbacks: [[]],
    errorMessages: ["자산 목록 조회에 실패했습니다."],
  });

  const [assets] = data;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <ErrorToast errors={errors} />
      <PageHeader />
      <AssetListClient assets={assets} />
    </div>
  );
}
