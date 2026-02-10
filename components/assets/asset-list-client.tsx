"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { AssetFormSheet } from "./asset-form-sheet";
import type { Asset } from "@/lib/validations/asset";
import { ASSET_TYPE_ICONS, ASSET_TYPE_LABELS } from "@/lib/const";

interface AssetListClientProps {
  assets: Asset[];
}

export function AssetListClient({ assets }: AssetListClientProps) {
  const [formSheetOpen, setFormSheetOpen] = useState(false);

  const activeAssets = useMemo(
    () => assets.filter((a) => a.isActive),
    [assets],
  );
  const inactiveAssets = useMemo(
    () => assets.filter((a) => !a.isActive),
    [assets],
  );
  const totalBalance = useMemo(
    () => activeAssets.reduce((sum, a) => sum + Number(a.balance), 0),
    [activeAssets],
  );

  if (assets.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Wallet className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">등록된 자산이 없어요</p>
          <p className="text-sm mt-1">자산을 추가하여 관리해보세요</p>
          <Button className="mt-6" onClick={() => setFormSheetOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            자산 추가
          </Button>
        </div>
        <AssetFormSheet open={formSheetOpen} onOpenChange={setFormSheetOpen} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* 총 자산 요약 */}
      <div className="bg-card rounded-xl p-6">
        <p className="text-sm text-muted-foreground mb-1">총 자산</p>
        <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
        <p className="text-sm text-muted-foreground mt-2">
          {activeAssets.length}개 계좌
        </p>
      </div>

      {/* 활성 자산 목록 */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">자산 목록</h2>
        {activeAssets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>

      {/* 비활성 자산 목록 */}
      {inactiveAssets.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">
            비활성 자산
          </h2>
          {inactiveAssets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}

      {/* 자산 추가 버튼 */}
      <Button
        className="w-full"
        size="lg"
        onClick={() => setFormSheetOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        자산 추가
      </Button>

      <AssetFormSheet open={formSheetOpen} onOpenChange={setFormSheetOpen} />
    </div>
  );
}

function AssetCard({ asset }: { asset: Asset }) {
  const icon = asset.icon || ASSET_TYPE_ICONS[asset.type] || "💼";
  const balance = Number(asset.balance);

  return (
    <Link href={`/assets/${asset.id}`}>
      <div className="bg-card rounded-xl p-4 hover:bg-accent/50 transition-colors cursor-pointer">
        <div className="flex items-center gap-3">
          {/* 아이콘 */}
          <div className="text-2xl">{icon}</div>

          {/* 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{asset.name}</span>
              <Badge variant="secondary" className="text-xs">
                {ASSET_TYPE_LABELS[asset.type] || asset.type}
              </Badge>
              {!asset.isActive && (
                <Badge variant="outline" className="text-xs">
                  비활성
                </Badge>
              )}
            </div>
            {asset.institution && (
              <p className="text-sm text-muted-foreground truncate">
                {asset.institution}
              </p>
            )}
          </div>

          {/* 잔액 */}
          <div className="text-right">
            <p className="font-semibold">{formatCurrency(balance)}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
