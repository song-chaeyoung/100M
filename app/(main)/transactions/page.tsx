import { PageHeader } from "@/components/page-header";
import { Calendar } from "@/components/calendar/calendar";
import { getTransactionsByMonth } from "@/app/actions/transactions";
import { getCategories } from "@/app/actions/categories";
import { handleApiResults } from "@/lib/utils/api-handler";
import type { TransactionSummary } from "@/lib/api/types";
import type { Category } from "@/db/schema";
import dayjs from "dayjs";

export default async function TransactionsPage() {
  const currentMonth = dayjs().format("YYYY-MM");

  const { data, errors } = await handleApiResults<
    [TransactionSummary[], Category[], Category[], Category[]]
  >(
    [
      getTransactionsByMonth(currentMonth),
      getCategories("EXPENSE"),
      getCategories("INCOME"),
      getCategories("SAVING"),
    ],
    {
      fallbacks: [[], [], [], []],
      errorMessages: [
        "거래 내역 조회에 실패했습니다.",
        "지출 카테고리 조회에 실패했습니다.",
        "수입 카테고리 조회에 실패했습니다.",
        "저축 카테고리 조회에 실패했습니다.",
      ],
    },
  );

  const [
    initialTransactions,
    expenseCategories,
    incomeCategories,
    savingCategories,
  ] = data;

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
