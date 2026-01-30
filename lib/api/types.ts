export interface TransactionSummary {
  date: string;
  hasIncome: boolean;
  hasExpense: boolean;
  hasSaving: boolean;
}

export type TransactionType = "INCOME" | "EXPENSE" | "SAVING";
export type CategoryType = "INCOME" | "EXPENSE" | "SAVING";

export interface Transaction {
  id: number;
  userId: string;
  amount: string;
  type: TransactionType;
  method: "CARD" | "CASH" | null;
  date: string;
  categoryId: number | null;
  memo: string | null;
  isFixed: boolean;
  isConfirmed: boolean;
  fixedExpenseId: number | null;
  linkedAssetTransactionId: number | null;
  createdAt: Date;
  updatedAt: Date;
}
