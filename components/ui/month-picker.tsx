"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import dayjs from "dayjs";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MonthCalendar } from "@/components/ui/month-calendar";

interface MonthPickerProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function MonthPicker({
  value,
  onChange,
  className,
  placeholder = "날짜 선택",
}: MonthPickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            dayjs(value).format("YYYY년 M월")
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <MonthCalendar
          value={value}
          onChange={(val) => {
            onChange(val);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
