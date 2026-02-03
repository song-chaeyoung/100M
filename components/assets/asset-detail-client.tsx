"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/alert-dialog";
import { AssetHeader } from "./asset-header";
import { AssetTransactionList } from "./asset-transaction-list";
import { AssetTransactionFormSheet } from "./asset-transaction-form-sheet";
import { AssetFormSheet } from "./asset-form-sheet";
import { deleteAssetTransaction } from "@/app/actions/asset-transactions";
import { toast } from "sonner";
import type { Asset } from "@/lib/validations/asset";
import type { AssetTransaction } from "@/lib/validations/asset-transaction";

interface AssetDetailClientProps {
  asset: Asset;
  transactions: AssetTransaction[];
  allAssets: Asset[];
}

export function AssetDetailClient({
  asset,
  transactions,
  allAssets,
}: AssetDetailClientProps) {
  const [transactionSheet, setTransactionSheet] = useState<
    AssetTransaction | "new" | null
  >(null);
  const [assetFormSheetOpen, setAssetFormSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const handleAddTransaction = () => {
    setTransactionSheet("new");
  };

  const handleEditTransaction = (transaction: AssetTransaction) => {
    if (transaction.isFixed) {
      toast.error("자동 생성된 거래는 수정할 수 없습니다.");
      return;
    }
    setTransactionSheet(transaction);
  };

  const handleDeleteTransaction = (id: number, isFixed: boolean) => {
    if (isFixed) {
      toast.error("자동 생성된 거래는 삭제할 수 없습니다.");
      return;
    }
    setDeleteTarget(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    const result = await deleteAssetTransaction(deleteTarget);
    if (result.success) {
      toast.success("거래가 삭제되었습니다.");
    } else {
      toast.error(result.error || "삭제에 실패했습니다.");
    }
    setDeleteTarget(null);
  };

  const handleCloseForm = () => {
    setTransactionSheet(null);
  };

  return (
    <div className="container mx-auto p-4 space-y-6 pb-24">
      <AssetHeader asset={asset} onEdit={() => setAssetFormSheetOpen(true)} />

      <AssetTransactionList
        transactions={transactions}
        onEdit={handleEditTransaction}
        onDelete={handleDeleteTransaction}
      />

      {/* 플로팅 버튼 */}
      <Button
        onClick={handleAddTransaction}
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* 거래 등록/수정 시트 */}
      <AssetTransactionFormSheet
        open={transactionSheet !== null}
        onOpenChange={handleCloseForm}
        assetId={asset.id}
        allAssets={allAssets}
        editingTransaction={
          transactionSheet === "new" ? null : transactionSheet
        }
      />

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="거래 삭제"
        description="정말 이 거래를 삭제하시겠어요? 자산 잔액이 자동으로 조정됩니다."
      />

      {/* 자산 수정 시트 */}
      <AssetFormSheet
        open={assetFormSheetOpen}
        onOpenChange={setAssetFormSheetOpen}
        editingAsset={asset}
      />
    </div>
  );
}
