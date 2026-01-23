"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import dayjs from "dayjs";
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { CalendarGrid } from "./calendar-grid";
import { getTransactionsByMonth } from "@/lib/api/transactions";
import type { TransactionSummary } from "@/lib/api/types";
import type { Category } from "@/lib/api/categories";
import { CalendarBottomSheet } from "./calendar-bottom-sheet";

interface MonthSlide {
  month: string;
  transactions: TransactionSummary[];
}

interface CalendarProps {
  initialTransactions: TransactionSummary[];
  expenseCategories: Category[];
  incomeCategories: Category[];
}

export function Calendar({
  initialTransactions,
  expenseCategories,
  incomeCategories,
}: CalendarProps) {
  const [api, setApi] = useState<CarouselApi>();
  const skipScrollRef = useRef(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const [slides, setSlides] = useState<MonthSlide[]>([
    {
      month: dayjs().subtract(1, "month").format("YYYY-MM"),
      transactions: [],
    },
    { month: dayjs().format("YYYY-MM"), transactions: initialTransactions },
    {
      month: dayjs().add(1, "month").format("YYYY-MM"),
      transactions: [],
    },
  ]);

  const loadMonthData = useCallback(async (month: string, index: number) => {
    try {
      const data = await getTransactionsByMonth(month);
      setSlides((prev) => {
        const newSlides = [...prev];
        newSlides[index] = { month, transactions: data };
        return newSlides;
      });
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    }
  }, []);

  // 현재 월 데이터 다시 로드하는 함수
  const refetchCurrentMonth = useCallback(async () => {
    if (!api) return;

    const currentIndex = api.selectedScrollSnap();
    const currentSlide = slides[currentIndex];

    if (currentSlide) {
      await loadMonthData(currentSlide.month, currentIndex);
    }
  }, [api, slides, loadMonthData]);

  useEffect(() => {
    if (!api) return;

    const onSelect = async () => {
      if (skipScrollRef.current) {
        skipScrollRef.current = false;
        return;
      }

      const index = api.selectedScrollSnap();
      const selectedSlide = slides[index];

      if (selectedSlide.transactions.length === 0) {
        await loadMonthData(selectedSlide.month, index);
      }

      if (index === 0) {
        const newPrevMonth = dayjs(selectedSlide.month)
          .subtract(1, "month")
          .format("YYYY-MM");

        setSlides([
          { month: newPrevMonth, transactions: [] },
          {
            month: selectedSlide.month,
            transactions: selectedSlide.transactions,
          },
          {
            month: dayjs(selectedSlide.month).add(1, "month").format("YYYY-MM"),
            transactions: [],
          },
        ]);

        skipScrollRef.current = true;
        setTimeout(() => api.scrollTo(1, true), 0);
      } else if (index === 2) {
        const newNextMonth = dayjs(selectedSlide.month)
          .add(1, "month")
          .format("YYYY-MM");

        setSlides([
          {
            month: dayjs(selectedSlide.month)
              .subtract(1, "month")
              .format("YYYY-MM"),
            transactions: [],
          },
          {
            month: selectedSlide.month,
            transactions: selectedSlide.transactions,
          },
          { month: newNextMonth, transactions: [] },
        ]);

        skipScrollRef.current = true;
        setTimeout(() => api.scrollTo(1, true), 0);
      }
    };

    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api, slides, loadMonthData]);

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    setIsBottomSheetOpen(true);
  };

  return (
    <>
      <div className="space-y-4 items-center select-none">
        <Carousel
          setApi={setApi}
          className="w-full"
          opts={{
            startIndex: 1,
            loop: false,
            align: "start",
          }}
        >
          <CarouselContent>
            {slides.map((slide, index) => (
              <CarouselItem key={`${slide.month}-${index}`}>
                <h2 className="text-lg font-semibold mb-2">
                  {dayjs(slide.month).format("YYYY년 M월")}
                </h2>
                <CalendarGrid
                  currentMonth={slide.month}
                  transactions={slide.transactions}
                  selectedDate={selectedDate}
                  onDateClick={handleDateClick}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      <CalendarBottomSheet
        open={isBottomSheetOpen}
        onOpenChange={setIsBottomSheetOpen}
        selectedDate={selectedDate}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
        onTransactionChange={refetchCurrentMonth}
      />
    </>
  );
}
