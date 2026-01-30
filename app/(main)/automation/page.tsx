import { PageHeader } from "@/components/page-header";
import { AutomationContent } from "@/components/automation/automation-content";
import { getFixedExpenses } from "@/app/actions/fixed-expenses";
import { getFixedSavings } from "@/app/actions/fixed-savings";
import { getAssets } from "@/app/actions/assets";
import { getCategories } from "@/app/actions/categories";

export default async function AutomationPage() {
  const [fixedExpenses, fixedSavings, categories, assets] = await Promise.all([
    getFixedExpenses(),
    getFixedSavings(),
    getCategories("EXPENSE"),
    getAssets(),
  ]);

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
