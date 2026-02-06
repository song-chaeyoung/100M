import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { AutomationContent } from "@/components/automation/automation-content";
import { getFixedExpenses } from "@/app/actions/fixed-expenses";
import { getFixedSavings } from "@/app/actions/fixed-savings";
import { getAssets } from "@/app/actions/assets";
import { getCategories } from "@/app/actions/categories";
import { handleApiResults } from "@/lib/utils/api-handler";
import type { FixedExpense, FixedSaving } from "@/lib/types/automation";
import type { Category } from "@/db/schema";
import type { Asset } from "@/lib/validations/asset";

export const metadata: Metadata = {
  title: "자동화",
};

export default async function AutomationPage() {
  const { data, errors } = await handleApiResults<
    [FixedExpense[], FixedSaving[], Category[], Asset[]]
  >(
    [
      getFixedExpenses(),
      getFixedSavings(),
      getCategories("EXPENSE"),
      getAssets(),
    ],
    {
      fallbacks: [[], [], [], []],
      errorMessages: [
        "고정 지출 조회에 실패했습니다.",
        "고정 저축 조회에 실패했습니다.",
        "카테고리 조회에 실패했습니다.",
        "자산 계좌 조회에 실패했습니다.",
      ],
    },
  );

  const [fixedExpenses, fixedSavings, categories, assets] = data;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader />
      <AutomationContent
        fixedExpenses={fixedExpenses}
        fixedSavings={fixedSavings}
        categories={categories}
        assets={assets}
      />
    </div>
  );
}
