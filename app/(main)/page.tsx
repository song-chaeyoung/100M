import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { redirect } from "next/navigation";
import { Calendar } from "@/components/calendar/calendar";
import { getTransactionsByMonth } from "@/app/actions/transactions";
import { getCategories } from "@/app/actions/categories";
import dayjs from "dayjs";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const currentMonth = dayjs().format("YYYY-MM");

  // 초기 데이터 병렬 fetch
  const [initialTransactions, expenseCategories, incomeCategories] =
    await Promise.all([
      getTransactionsByMonth(currentMonth),
      getCategories("EXPENSE"),
      getCategories("INCOME"),
    ]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader
        action={
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              로그아웃
            </Button>
          </form>
        }
      />
      <div className="text-lg font-semibold">
        {session.user.name}님의 수입/지출 내역
      </div>
      <Calendar
        initialTransactions={initialTransactions}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
      />
    </div>
  );
}
