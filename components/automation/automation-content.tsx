"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Category } from "@/lib/api/categories";
import type { FixedExpense, FixedSaving, Asset } from "@/lib/types/automation";
import { AutomationSummaryCards } from "./automation-summary-cards";
import { FixedExpenseList } from "./fixed-expense-list";
import { FixedSavingList } from "./fixed-saving-list";
import { FixedExpenseFormSheet } from "./fixed-expense-form-sheet";
import { FixedSavingFormSheet } from "./fixed-saving-form-sheet";
import { AddFixedItemSheet } from "./add-fixed-item-sheet";

interface AutomationContentProps {
  fixedExpenses: FixedExpense[];
  fixedSavings: FixedSaving[];
  categories: Category[];
  assets: Asset[];
}

export function AutomationContent({
  fixedExpenses,
  fixedSavings,
  categories,
  assets,
}: AutomationContentProps) {
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  // 고정 지출 수정
  // const [expenseEditOpen, setExpenseEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(
    null,
  );

  // 고정 저축 수정
  // const [savingEditOpen, setSavingEditOpen] = useState(false);
  const [editingSaving, setEditingSaving] = useState<FixedSaving | null>(null);

  const totalExpense = fixedExpenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const totalSaving = fixedSavings.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );

  const handleEditExpense = (item: FixedExpense) => {
    setEditingExpense(item);
    // setExpenseEditOpen(true);
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    const { deleteFixedExpense } = await import("@/app/actions/fixed-expenses");
    const result = await deleteFixedExpense(id);

    if (!result.success) {
      alert("삭제에 실패했습니다.");
    }
  };

  const handleEditSaving = (item: FixedSaving) => {
    setEditingSaving(item);
    // setSavingEditOpen(true);
  };

  const handleDeleteSaving = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    const { deleteFixedSaving } = await import("@/app/actions/fixed-savings");
    const result = await deleteFixedSaving(id);

    if (!result.success) {
      alert("삭제에 실패했습니다.");
    }
  };

  const handleClose = () => {
    setEditingExpense(null);
    setEditingSaving(null);
  };

  return (
    <div className="space-y-6">
      <AutomationSummaryCards
        totalExpense={totalExpense}
        totalSaving={totalSaving}
      />

      <div className="space-y-2">
        <FixedExpenseList
          items={fixedExpenses}
          onEdit={handleEditExpense}
          onDelete={handleDeleteExpense}
        />
        <FixedSavingList
          items={fixedSavings}
          onEdit={handleEditSaving}
          onDelete={handleDeleteSaving}
        />
      </div>

      <Button
        onClick={() => setAddSheetOpen(true)}
        className="w-full"
        size="lg"
      >
        <Plus className="h-4 w-4 mr-2" />
        고정 항목 추가
      </Button>

      {/* 추가 시트 */}
      <AddFixedItemSheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        categories={categories}
        assets={assets}
      />

      {/* 고정 지출 수정 시트 */}
      <FixedExpenseFormSheet
        open={!!editingExpense}
        onOpenChange={handleClose}
        mode="edit"
        initialData={
          editingExpense
            ? {
                id: editingExpense.id,
                title: editingExpense.title,
                amount: editingExpense.amount,
                scheduledDay: editingExpense.scheduledDay,
                type: editingExpense.type,
                categoryId: editingExpense.categoryId,
                method: editingExpense.method,
                startDate: editingExpense.startDate,
                endDate: editingExpense.endDate,
              }
            : undefined
        }
        categories={categories}
      />

      {/* 고정 저축 수정 시트 */}
      <FixedSavingFormSheet
        open={!!editingSaving}
        onOpenChange={handleClose}
        mode="edit"
        initialData={
          editingSaving
            ? {
                id: editingSaving.id,
                title: editingSaving.title,
                amount: editingSaving.amount,
                scheduledDay: editingSaving.scheduledDay,
                assetId: editingSaving.assetId,
                startDate: editingSaving.startDate,
                endDate: editingSaving.endDate,
              }
            : undefined
        }
        assets={assets}
      />
    </div>
  );
}
