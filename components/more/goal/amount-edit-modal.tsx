"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatAmount } from "@/lib/utils";
import { toast } from "sonner";

// 콤마 제거하고 숫자로 변환
function parseNumber(value: string): number {
  return Number(value.replace(/[^\d]/g, "")) || 0;
}

interface AmountEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  placeholder: string;
  initialValue: number;
  onSave: (value: number) => Promise<{ success: boolean; error?: string }>;
}

export function AmountEditModal({
  open,
  onOpenChange,
  title,
  description,
  placeholder,
  initialValue,
  onSave,
}: AmountEditModalProps) {
  const [inputValue, setInputValue] = useState(
    formatAmount(initialValue.toString()),
  );
  const [isSaving, setIsSaving] = useState(false);

  // 입력값 변경 핸들러 (콤마 자동 포맷팅)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(formatAmount(value));
  };

  // 저장
  const handleSave = async () => {
    setIsSaving(true);
    const result = await onSave(parseNumber(inputValue));

    if (result.success) {
      onOpenChange(false);
    } else {
      toast.error(result.error);
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={() =>
          setInputValue(formatAmount(initialValue.toString()))
        }
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              ₩
            </span>
            <Input
              type="text"
              inputMode="numeric"
              value={inputValue}
              onChange={handleInputChange}
              placeholder={placeholder}
              className="pl-7"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="flex-1 cursor-pointer"
          >
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 cursor-pointer"
          >
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
