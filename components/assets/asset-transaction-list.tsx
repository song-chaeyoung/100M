"use client";

import { useMemo } from "react";
import { FileText } from "lucide-react";
import { AssetTransactionItem } from "./asset-transaction-item";
import dayjs from "dayjs";
import { AssetTransaction } from "@/lib/validations/asset-transaction";

interface AssetTransactionListProps {
  transactions: AssetTransaction[];
  onEdit: (transaction: AssetTransaction) => void;
  onDelete: (id: number, isFixed: boolean) => void;
}

// 날짜별로 거래 그룹핑
function groupTransactionsByDate(transactions: AssetTransaction[]) {
  const groups: Record<string, AssetTransaction[]> = {};

  transactions.forEach((transaction) => {
    const dateKey = transaction.date;
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(transaction);
  });

  // 날짜 내림차순 정렬
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return sortedDates.map((date) => ({
    date,
    transactions: groups[date],
  }));
}

function formatDateLabel(dateStr: string): string {
  const date = dayjs(dateStr);
  const today = dayjs().startOf("day");
  const yesterday = today.subtract(1, "day");

  if (date.isSame(today, "day")) {
    return "오늘";
  }
  if (date.isSame(yesterday, "day")) {
    return "어제";
  }

  return date.format("M월 D일 (ddd)");
}

export function AssetTransactionList({
  transactions,
  onEdit,
  onDelete,
}: AssetTransactionListProps) {
  const groupedTransactions = useMemo(
    () => groupTransactionsByDate(transactions),
    [transactions],
  );

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <FileText className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">아직 거래 내역이 없어요</p>
        <p className="text-sm mt-1">+ 버튼을 눌러 거래를 추가해보세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">입출금 내역</h2>

      {groupedTransactions.map(({ date, transactions: dayTransactions }) => (
        <div key={date} className="space-y-2">
          {/* 날짜 헤더 */}
          <div className="text-sm font-medium text-muted-foreground px-1">
            {formatDateLabel(date)}
          </div>

          {/* 거래 리스트 */}
          <div className="space-y-2">
            {dayTransactions.map((transaction) => (
              <AssetTransactionItem
                key={transaction.id}
                transaction={transaction}
                onTap={() => onEdit(transaction)}
                onDelete={() => onDelete(transaction.id, transaction.isFixed)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
