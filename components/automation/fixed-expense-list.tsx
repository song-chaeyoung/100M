"use client";

import { CreditCard } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FixedItemRow } from "./fixed-item-row";
import { formatCurrency } from "@/lib/utils";
import type { FixedExpense } from "@/lib/types/automation";

interface FixedExpenseListProps {
  items: FixedExpense[];
  onEdit: (item: FixedExpense) => void;
  onDelete: (id: number) => void;
}

export function FixedExpenseList({
  items,
  onEdit,
  onDelete,
}: FixedExpenseListProps) {
  const totalAmount = items.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <Accordion type="multiple" defaultValue={["expense"]}>
      <AccordionItem value="expense">
        <AccordionTrigger className="hover:no-underline flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 leading-none">
              <div className="p-1.5 rounded-full bg-red-50">
                <CreditCard className="h-4 w-4 text-red-600" />
              </div>
              <span>고정 지출</span>
              <span className="text-muted-foreground text-xs">
                ({items.length}건)
              </span>
            </div>
            <span className="text-red-600 font-semibold leading-none">
              {formatCurrency(-totalAmount, true)}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          {items.length > 0 ? (
            <div className="divide-y">
              {items.map((item) => (
                <FixedItemRow
                  key={item.id}
                  icon={item.category?.icon || "💸"}
                  title={item.title}
                  scheduledDay={item.scheduledDay}
                  amount={Number(item.amount)}
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CreditCard className="h-8 w-8 mb-2 opacity-50" />
              <span className="text-sm">고정 지출을 등록해보세요</span>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
