import { CreditCard, PiggyBank } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface AutomationSummaryCardsProps {
  totalExpense: number;
  totalSaving: number;
}

export function AutomationSummaryCards({
  totalExpense,
  totalSaving,
}: AutomationSummaryCardsProps) {
  const items = [
    {
      label: "월 고정 지출",
      amount: -totalExpense,
      icon: CreditCard,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "월 고정 저축",
      amount: totalSaving,
      icon: PiggyBank,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="py-4">
          <CardContent className="flex flex-col items-center gap-2 px-2">
            <div className={`p-2 rounded-full ${item.bgColor}`}>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <span className="text-xs text-muted-foreground">{item.label}</span>
            <span className={`text-sm font-semibold ${item.color}`}>
              {formatCurrency(item.amount, true)}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
