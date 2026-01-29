import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { redirect } from "next/navigation";
import { GoalProgressCard } from "@/components/home/goal-progress-card";
import { MonthlySummaryCards } from "@/components/home/monthly-summary-cards";
import { getDashboardData } from "@/app/actions/dashboard";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const data = await getDashboardData();

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader />

      <GoalProgressCard
        targetAmount={data.goal.targetAmount}
        initialAmount={data.goal.initialAmount}
        totalIncome={data.totalSummary.totalIncome}
        totalExpense={data.totalSummary.totalExpense}
        totalAssets={data.totalSummary.totalAssets}
      />

      <MonthlySummaryCards
        income={data.monthlySummary.income}
        expense={data.monthlySummary.expense}
        saving={data.monthlySummary.saving}
      />
    </div>
  );
}
