export interface TransactionSummary {
  date: string;
  hasIncome: boolean;
  hasExpense: boolean;
}

export interface Transaction {
  id: number;
  userId: string;
  amount: string;
  type: "INCOME" | "EXPENSE";
  method: "CARD" | "CASH";
  date: string;
  categoryId: number;
  memo?: string;
  isFixed: boolean;
  fixedExpenseId?: number;
  createdAt: Date;
  updatedAt: Date;
}
