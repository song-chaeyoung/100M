import { Wallet, CreditCard, PiggyBank } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface MonthlySummaryCardsProps {
  income: number;
  expense: number;
  saving: number;
}

export function MonthlySummaryCards({
  income,
  expense,
  saving,
}: MonthlySummaryCardsProps) {
  const items = [
    {
      label: "수입",
      amount: income,
      icon: Wallet,
      color: "text-green-600",
      bgColor: "bg-green-50",
      showSign: true,
    },
    {
      label: "지출",
      amount: -expense,
      icon: CreditCard,
      color: "text-red-600",
      bgColor: "bg-red-50",
      showSign: true,
    },
    {
      label: "저축",
      amount: saving,
      icon: PiggyBank,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      showSign: true,
    },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">이번 달 요약</h2>
      <div className="grid grid-cols-3 gap-3">
        {items.map((item) => (
          <Card key={item.label} className="py-4">
            <CardContent className="flex flex-col items-center gap-2 px-2">
              <div className={`p-2 rounded-full ${item.bgColor}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className={`text-sm font-semibold ${item.color}`}>
                {formatCurrency(item.amount, item.showSign)}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
