"use client";

import * as React from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  showCloseButton = true,
  className,
}: BottomSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={cn("max-h-[90vh]", className)}>
        {/* 드래그 핸들 (Drawer에 기본 포함) */}

        {/* 헤더 */}
        {(title || description || showCloseButton) && (
          <DrawerHeader className="relative">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {title && <DrawerTitle>{title}</DrawerTitle>}
                {description && (
                  <DrawerDescription>{description}</DrawerDescription>
                )}
              </div>
              {showCloseButton && (
                <DrawerClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">닫기</span>
                  </Button>
                </DrawerClose>
              )}
            </div>
          </DrawerHeader>
        )}

        {/* 콘텐츠 */}
        <div className="overflow-y-auto px-4 pb-4">{children}</div>

        {/* 푸터 */}
        {footer && <DrawerFooter>{footer}</DrawerFooter>}
      </DrawerContent>
    </Drawer>
  );
}
