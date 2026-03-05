"use client";

import { useEffect, useState } from "react";
import { getCategorySummaryByMonth } from "@/lib/api/transactions";
import { formatCurrency } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface CategorySummaryItem {
  categoryId: number | null;
  categoryName: string | null;
  categoryIcon: string | null;
  type: "INCOME" | "EXPENSE" | "SAVING";
  total: string | null;
}

interface SectionData {
  label: string;
  type: "EXPENSE" | "INCOME" | "SAVING";
  items: CategorySummaryItem[];
  grandTotal: number;
}

const SECTION_CONFIG = {
  EXPENSE: { label: "지출", color: "bg-neutral-400" },
  INCOME: { label: "수입", color: "bg-neutral-400" },
  SAVING: { label: "저축", color: "bg-neutral-400" },
} as const;

interface CategorySummaryProps {
  month: string;
}

export function CategorySummary({ month }: CategorySummaryProps) {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      try {
        const res = await getCategorySummaryByMonth(month);
        if (!res.success || !res.data) {
          setSections([]);
          return;
        }

        const grouped: Record<string, CategorySummaryItem[]> = {};
        for (const item of res.data) {
          const type = item.type;
          if (!grouped[type]) grouped[type] = [];
          grouped[type].push(item);
        }

        const result: SectionData[] = (["EXPENSE", "INCOME", "SAVING"] as const)
          .filter((type) => grouped[type]?.length)
          .map((type) => {
            const items = grouped[type]!.sort(
              (a, b) => Number(b.total || 0) - Number(a.total || 0),
            );
            const grandTotal = items.reduce(
              (sum, item) => sum + Number(item.total || 0),
              0,
            );
            return {
              label: SECTION_CONFIG[type].label,
              type,
              items,
              grandTotal,
            };
          });

        setSections(result);
      } catch {
        setSections([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [month]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        이번 달 거래 내역이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.type} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{section.label}</h3>
            <span className="text-sm font-medium text-muted-foreground">
              {formatCurrency(section.grandTotal)}
            </span>
          </div>

          <div className="space-y-2">
            {section.items.map((item) => {
              const amount = Number(item.total || 0);
              const percent =
                section.grandTotal > 0
                  ? Math.round((amount / section.grandTotal) * 100)
                  : 0;
              const config = SECTION_CONFIG[section.type];

              return (
                <div key={`${item.categoryId ?? "none"}`} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {item.categoryIcon ?? "📂"} {item.categoryName ?? "기타"}
                    </span>
                    <span className="tabular-nums">
                      {formatCurrency(amount)} ({percent}%)
                    </span>
                  </div>
                  <Progress
                    value={percent}
                    className="h-2"
                    indicatorClassName={config.color}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
