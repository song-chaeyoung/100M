"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const pageInfo: Record<string, { title: string; description: string }> = {
  "/": {
    title: "홈",
    description: "일별 지출 내역을 확인합니다",
  },
  "/fixed-expenses": {
    title: "고정지출",
    description: "월세, 구독료 등 고정 지출을 관리합니다",
  },
  "/reports": {
    title: "리포트",
    description: "지출 통계 및 분석을 확인합니다",
  },
  "/settings": {
    title: "설정",
    description: "앱 설정을 관리합니다",
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
