"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/alert-dialog";
import { type Category } from "@/lib/api/categories";
import type { FixedExpense, FixedSaving, Asset } from "@/lib/types/automation";
import { AutomationSummaryCards } from "./automation-summary-cards";
import { FixedExpenseList } from "./fixed-expense-list";
import { FixedSavingList } from "./fixed-saving-list";
import { FixedExpenseFormSheet } from "./fixed-expense-form-sheet";
import { FixedSavingFormSheet } from "./fixed-saving-form-sheet";
import { BottomSheet } from "@/components/bottom-sheet";
import { toast } from "sonner";

type ModalState =
  | { type: "selectType" }
  | { type: "createExpense" }
  | { type: "createSaving" }
  | { type: "editExpense"; data: FixedExpense }
  | { type: "editSaving"; data: FixedSaving }
  | { type: "delete"; target: { kind: "expense" | "saving"; id: number } }
  | null;

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
  const [modal, setModal] = useState<ModalState>(null);

  const totalExpense = fixedExpenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const totalSaving = fixedSavings.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );

  const handleEditExpense = (item: FixedExpense) => {
    setModal({ type: "editExpense", data: item });
  };

  const handleDeleteExpense = (id: number) => {
    setModal({ type: "delete", target: { kind: "expense", id } });
  };

  const handleEditSaving = (item: FixedSaving) => {
    setModal({ type: "editSaving", data: item });
  };

  const handleDeleteSaving = (id: number) => {
    setModal({ type: "delete", target: { kind: "saving", id } });
  };

  const handleConfirmDelete = async () => {
    if (modal?.type !== "delete") return;

    const { target } = modal;
    if (target.kind === "expense") {
      const { deleteFixedExpense } = await import("@/app/actions/fixed-expenses");
      const result = await deleteFixedExpense(target.id);
      if (!result.success) {
        toast.error("삭제에 실패했습니다.");
      }
    } else {
      const { deleteFixedSaving } = await import("@/app/actions/fixed-savings");
      const result = await deleteFixedSaving(target.id);
      if (!result.success) {
        toast.error("삭제에 실패했습니다.");
      }
    }

    setModal(null);
  };

  const closeModal = () => setModal(null);

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
        onClick={() => setModal({ type: "selectType" })}
        className="w-full"
        size="lg"
      >
        <Plus className="h-4 w-4 mr-2" />
        고정 항목 추가
      </Button>

      {/* 타입 선택 시트 */}
      <BottomSheet
        open={modal?.type === "selectType"}
        onOpenChange={(open) => !open && closeModal()}
        title="추가할 항목 선택"
      >
        <div className="grid grid-cols-2 gap-3 py-4">
          <Button
            variant="outline"
            size="lg"
            className="h-20 flex-col gap-2"
            onClick={() => setModal({ type: "createExpense" })}
          >
            <span className="text-2xl">💸</span>
            <span>고정 지출</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-20 flex-col gap-2"
            onClick={() => setModal({ type: "createSaving" })}
          >
            <span className="text-2xl">💰</span>
            <span>고정 저축</span>
          </Button>
        </div>
      </BottomSheet>

      {/* 고정 지출 생성 시트 */}
      <FixedExpenseFormSheet
        open={modal?.type === "createExpense"}
        onOpenChange={closeModal}
        mode="create"
        categories={categories}
      />

      {/* 고정 저축 생성 시트 */}
      <FixedSavingFormSheet
        open={modal?.type === "createSaving"}
        onOpenChange={closeModal}
        mode="create"
        assets={assets}
      />

      {/* 고정 지출 수정 시트 */}
      <FixedExpenseFormSheet
        open={modal?.type === "editExpense"}
        onOpenChange={closeModal}
        mode="edit"
        initialData={
          modal?.type === "editExpense"
            ? {
                id: modal.data.id,
                title: modal.data.title,
                amount: modal.data.amount,
                scheduledDay: modal.data.scheduledDay,
                type: modal.data.type,
                categoryId: modal.data.categoryId,
                method: modal.data.method,
                startDate: modal.data.startDate,
                endDate: modal.data.endDate,
              }
            : undefined
        }
        categories={categories}
      />

      {/* 고정 저축 수정 시트 */}
      <FixedSavingFormSheet
        open={modal?.type === "editSaving"}
        onOpenChange={closeModal}
        mode="edit"
        initialData={
          modal?.type === "editSaving"
            ? {
                id: modal.data.id,
                title: modal.data.title,
                amount: modal.data.amount,
                scheduledDay: modal.data.scheduledDay,
                assetId: modal.data.assetId,
                startDate: modal.data.startDate,
                endDate: modal.data.endDate,
              }
            : undefined
        }
        assets={assets}
      />

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        open={modal?.type === "delete"}
        onOpenChange={closeModal}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
