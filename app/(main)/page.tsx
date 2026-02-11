import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { GoalProgressCard } from "@/components/home/goal-progress-card";
import { MonthlySummaryCards } from "@/components/home/monthly-summary-cards";
import { getDashboardData, type DashboardData } from "@/app/actions/dashboard";
import { handleApiResults } from "@/lib/utils/api-handler";
import { ErrorToast } from "@/components/error-toast";

export const metadata: Metadata = {
  title: "홈",
};

export default async function HomePage() {
  const { data, errors } = await handleApiResults<[DashboardData | null]>(
    [getDashboardData()],
    {
      fallbacks: [null],
      errorMessages: ["대시보드 데이터 조회에 실패했습니다."],
    },
  );

  const [dashboardData] = data;

  // 데이터가 없으면 fallback UI 표시
  if (!dashboardData) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <PageHeader />
        <ErrorToast errors={errors} />
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive mb-2">
            데이터를 불러올 수 없습니다
          </h2>
          <p className="text-sm text-muted-foreground">
            대시보드 데이터 조회 중 오류가 발생했습니다. 잠시 후 다시
            시도해주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <ErrorToast errors={errors} />
      <PageHeader />

      <GoalProgressCard
        targetAmount={dashboardData.goal.targetAmount}
        initialAmount={dashboardData.goal.initialAmount}
        totalIncome={dashboardData.totalSummary.totalIncome}
        totalExpense={dashboardData.totalSummary.totalExpense}
        totalAssets={dashboardData.totalSummary.totalAssets}
      />

      <MonthlySummaryCards
        income={dashboardData.monthlySummary.income}
        expense={dashboardData.monthlySummary.expense}
        saving={dashboardData.monthlySummary.saving}
      />
    </div>
  );
}
