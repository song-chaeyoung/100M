"use client";

import { ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Asset } from "@/lib/validations/asset";

const ASSET_TYPE_LABELS: Record<string, string> = {
  SAVINGS: "예금",
  DEPOSIT: "적금",
  CHECKING: "입출금통장",
  STOCK: "주식",
  FUND: "펀드",
  CRYPTO: "암호화폐",
  REAL_ESTATE: "부동산",
  OTHER: "기타",
};

const ASSET_TYPE_ICONS: Record<string, string> = {
  SAVINGS: "🏦",
  DEPOSIT: "💰",
  CHECKING: "💳",
  STOCK: "📈",
  FUND: "📊",
  CRYPTO: "🪙",
  REAL_ESTATE: "🏠",
  OTHER: "💼",
};

interface AssetHeaderProps {
  asset: Asset;
  onEdit?: () => void;
}

export function AssetHeader({ asset, onEdit }: AssetHeaderProps) {
  const router = useRouter();
  const balance = Number(asset.balance);
  const icon = asset.icon || ASSET_TYPE_ICONS[asset.type] || "💼";

  return (
    <div className="space-y-4">
      {/* 네비게이션 헤더 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="-ml-2"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
        >
          <Pencil className="h-5 w-5" />
        </Button>
      </div>

      {/* 자산 정보 카드 */}
      <div className="bg-card rounded-xl p-6 space-y-4">
        {/* 아이콘 + 이름 + 타입 */}
        <div className="flex items-center gap-3">
          <div className="text-3xl">{icon}</div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{asset.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">
                {ASSET_TYPE_LABELS[asset.type] || asset.type}
              </Badge>
              {asset.institution && (
                <span className="text-sm text-muted-foreground">
                  {asset.institution}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 잔액 */}
        <div className="pt-2">
          <p className="text-sm text-muted-foreground mb-1">현재 잔액</p>
          <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
        </div>

        {/* 추가 정보 */}
        {(asset.accountNumber || asset.interestRate) && (
          <div className="pt-2 border-t border-border flex gap-4 text-sm text-muted-foreground">
            {asset.accountNumber && (
              <span>계좌: {asset.accountNumber}</span>
            )}
            {asset.interestRate && (
              <span>이율: {asset.interestRate}%</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
