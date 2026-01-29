"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const pageInfo: Record<string, { title: string; description: string }> = {
  "/": {
    title: "홈",
    description: "목표 달성 현황을 확인합니다",
  },
  "/transactions": {
    title: "가계부",
    description: "수입/지출 내역을 관리합니다",
  },
  "/automation": {
    title: "자동화",
    description: "고정 지출/저축을 관리합니다",
  },
  "/assets": {
    title: "자산",
    description: "저축 및 투자 자산을 관리합니다",
  },
  "/more": {
    title: "더보기",
    description: "분석 및 설정을 관리합니다",
  },
};

interface PageHeaderProps {
  className?: string;
  action?: React.ReactNode;
}

export function PageHeader({ className, action }: PageHeaderProps) {
  const pathname = usePathname();
  const info = pageInfo[pathname] || { title: "일억모으기", description: "" };

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div>
        <h1 className="text-2xl font-bold">{info.title}</h1>
        {info.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {info.description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
