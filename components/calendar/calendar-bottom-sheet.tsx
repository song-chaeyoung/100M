"use client";

import { useState, useEffect, Fragment } from "react";
import dayjs from "dayjs";
import { Plus } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/ui/button";
import { TransactionFormSheet } from "./transaction-form-sheet";
import { getTransactionsByDate } from "@/app/actions/transactions";
import type { Category } from "@/lib/api/categories";
import type { Transaction } from "@/lib/api/types";
import { Skeleton } from "@/components/ui/skeleton";

interface CalendarBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string | null;
  expenseCategories: Category[];
  incomeCategories: Category[];
  onTransactionChange?: () => void | Promise<void>;
}

export function CalendarBottomSheet({
  open,
  onOpenChange,
  selectedDate,
  expenseCategories,
  incomeCategories,
  onTransactionChange,
}: CalendarBottomSheetProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (open && selectedDate) {
        setIsLoading(true);
        try {
          const data = await getTransactionsByDate(selectedDate);
          setTransactions(data);
        } catch (error) {
          console.error("Failed to fetch transactions:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchTransactions();
  }, [open, selectedDate]);

  if (!selectedDate) return null;

  const handleAddTransaction = () => {
    setSelectedTransaction(null);
    setIsFormOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleFormClose = async (open: boolean) => {
    setIsFormOpen(open);

    // 폼이 닫힐 때 데이터 갱신
    if (!open && onTransactionChange) {
      await onTransactionChange();
      // 현재 보고 있는 날짜의 거래 내역도 갱신
      if (selectedDate) {
        setIsLoading(true);
        try {
          const data = await getTransactionsByDate(selectedDate);
          setTransactions(data);
        } catch (error) {
          console.error("Failed to fetch transactions:", error);
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  return (
    <>
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={dayjs(selectedDate).format("YYYY년 M월 D일")}
        // description="거래 내역"
      >
        <div className="space-y-4">
          {/* 거래 내역 리스트 영역 */}
          <div className="">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg border shadow-sm"
                  >
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[120px]" />
                      <div className="flex gap-2">
                        <Skeleton className="h-3 w-4 rounded-full" />
                        <Skeleton className="h-3 w-[60px]" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-[80px]" />
                  </div>
                ))}
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((transaction) => {
                  const category = [
                    ...expenseCategories,
                    ...incomeCategories,
                  ].find((c) => c.id === transaction.categoryId);

                  return (
                    <div
                      key={transaction.id}
                      onClick={() => handleEditTransaction(transaction)}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground shadow-sm cursor-pointer hover:bg-accent transition-colors"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">
                          {transaction.memo || category?.name || "기타"}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10px]">
                            {category?.icon || "📝"}
                          </span>
                          <span>{category?.name || "카테고리 없음"}</span>
                          <span>•</span>
                          <span>
                            {transaction.method === "CARD" ? "카드" : "현금"}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          transaction.type === "INCOME"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {transaction.type === "INCOME" ? "+" : "-"}
                        {parseInt(transaction.amount).toLocaleString()}원
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Fragment></Fragment>
            )}
          </div>

          {/* 추가 버튼 */}
          <Button onClick={handleAddTransaction} className="w-full" size="lg">
            <Plus className="mr-2 h-5 w-5" />
            거래 추가
          </Button>
        </div>
      </BottomSheet>

      <TransactionFormSheet
        open={isFormOpen}
        onOpenChange={handleFormClose}
        selectedDate={selectedDate}
        mode={selectedTransaction ? "edit" : "create"}
        initialData={
          selectedTransaction
            ? {
                id: selectedTransaction.id,
                type: selectedTransaction.type,
                amount: selectedTransaction.amount,
                method: selectedTransaction.method,
                categoryId: selectedTransaction.categoryId,
                memo: selectedTransaction.memo || "",
                date: new Date(selectedTransaction.date),
              }
            : undefined
        }
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
      />
    </>
  );
}
