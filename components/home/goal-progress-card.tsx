import { Target } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";

interface GoalProgressCardProps {
  targetAmount: number;
  initialAmount: number;
  totalIncome: number;
  totalExpense: number;
  totalAssets: number;
}

export function GoalProgressCard({
  targetAmount,
  initialAmount,
  totalIncome,
  totalExpense,
  totalAssets,
}: GoalProgressCardProps) {
  // 순자산 = 초기자금 + 수입 - 지출 + 자산
  const netWorth = initialAmount + totalIncome - totalExpense + totalAssets;
  const progressPercent = Math.min((netWorth / targetAmount) * 100, 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <CardTitle>1억 달성 현황</CardTitle>
        </div>
        <CardDescription>목표까지 열심히 달려봐요</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">달성률</span>
            <span className="font-semibold">{progressPercent.toFixed(1)}%</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
        </div>

        <div className="flex justify-between items-baseline">
          <span className="text-2xl font-bold">{formatCurrency(netWorth)}</span>
          <span className="text-muted-foreground">
            / {formatCurrency(targetAmount)}
          </span>
        </div>

        <Accordion type="single" collapsible>
          <AccordionItem
            value="detail"
            className="border-none bg-muted/50 rounded-lg"
          >
            <AccordionTrigger className="px-3 py-2 text-sm text-muted-foreground hover:no-underline">
              산출 내역
            </AccordionTrigger>
            <AccordionContent className="px-3">
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>초기자금</span>
                  <span>{formatCurrency(initialAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>수입</span>
                  <span className="text-green-600">
                    + {formatCurrency(totalIncome)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>지출</span>
                  <span className="text-red-500">
                    - {formatCurrency(totalExpense)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>자산</span>
                  <span className="text-green-600">
                    + {formatCurrency(totalAssets)}
                  </span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
