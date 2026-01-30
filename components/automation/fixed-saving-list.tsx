"use client";

import { PiggyBank } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FixedItemRow } from "./fixed-item-row";
import { formatCurrency } from "@/lib/utils";
import type { FixedSaving } from "@/lib/types/automation";

interface FixedSavingListProps {
  items: FixedSaving[];
  onEdit: (item: FixedSaving) => void;
  onDelete: (id: number) => void;
}

export function FixedSavingList({
  items,
  onEdit,
  onDelete,
}: FixedSavingListProps) {
  const totalAmount = items.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  return (
    <Accordion type="multiple" defaultValue={["saving"]}>
      <AccordionItem value="saving">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-blue-50">
              <PiggyBank className="h-4 w-4 text-blue-600" />
            </div>
            <span>고정 저축</span>
            <span className="text-muted-foreground text-xs">
              ({items.length}건)
            </span>
          </div>
          <span className="text-blue-600 font-semibold mr-2">
            {formatCurrency(totalAmount, true)}
          </span>
        </AccordionTrigger>
        <AccordionContent>
          {items.length > 0 ? (
            <div className="divide-y">
              {items.map((item) => (
                <FixedItemRow
                  key={item.id}
                  icon="💰"
                  title={item.title}
                  scheduledDay={item.scheduledDay}
                  amount={Number(item.amount)}
                  subText={item.asset?.name}
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <PiggyBank className="h-8 w-8 mb-2 opacity-50" />
              <span className="text-sm">고정 저축을 등록해보세요</span>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
