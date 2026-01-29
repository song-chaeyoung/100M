import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { redirect } from "next/navigation";
import { Calendar } from "@/components/calendar/calendar";
import { getTransactionsByMonth } from "@/app/actions/transactions";
import { getCategories } from "@/app/actions/categories";
import dayjs from "dayjs";

export default async function TransactionsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const currentMonth = dayjs().format("YYYY-MM");

  const [initialTransactions, expenseCategories, incomeCategories, savingCategories] =
    await Promise.all([
      getTransactionsByMonth(currentMonth),
      getCategories("EXPENSE"),
      getCategories("INCOME"),
      getCategories("SAVING"),
    ]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader />
      <Calendar
        initialTransactions={initialTransactions}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
        savingCategories={savingCategories}
      />
    </div>
  );
}
