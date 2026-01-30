"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";

interface FixedItemRowProps {
  icon: string;
  title: string;
  scheduledDay: number;
  amount: number;
  subText?: string; // 고정 저축의 경우 자산 계좌명
  onEdit: () => void;
  onDelete: () => void;
}

export function FixedItemRow({
  icon,
  title,
  scheduledDay,
  amount,
  subText,
  onEdit,
  onDelete,
}: FixedItemRowProps) {
  return (
    <div className="flex items-center justify-between py-3 px-1">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div className="flex flex-col">
          <span className="font-medium">{title}</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>매월 {scheduledDay}일</span>
            {subText && (
              <>
                <span>·</span>
                <span>{subText}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="font-semibold">
          {formatCurrency(amount)}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              수정
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
