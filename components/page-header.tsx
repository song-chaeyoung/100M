"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const pageInfo: Record<string, { title: string; description?: string }> = {
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
  "/more/app-info": {
    title: "앱 정보",
  },
  "/more/privacy": {
    title: "개인정보 처리방침",
  },
};

interface PageHeaderProps {
  className?: string;
  action?: React.ReactNode;
  title?: string;
  description?: string;
  backHref?: string;
}

export function PageHeader({
  className,
  action,
  title,
  description,
  backHref,
}: PageHeaderProps) {
  const pathname = usePathname();
  const info = pageInfo[pathname] || { title: "일억모으기" };

  const displayTitle = title ?? info.title;
  const displayDescription = description ?? info.description;

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-2">
        {backHref && (
          <Link
            href={backHref}
            className="text-muted-foreground hover:text-primary"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        )}
        <div>
          <h1 className="text-2xl font-bold">{displayTitle}</h1>
          {displayDescription && (
            <p className="mt-1 text-sm text-muted-foreground">
              {displayDescription}
            </p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
