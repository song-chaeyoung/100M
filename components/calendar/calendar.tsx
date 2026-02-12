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
import { CategorySummary } from "./category-summary";

interface MonthSlide {
  month: string;
  transactions: TransactionSummary[];
}

interface CalendarProps {
  initialTransactions: TransactionSummary[];
  expenseCategories: Category[];
  incomeCategories: Category[];
  savingCategories: Category[];
}

export function Calendar({
  initialTransactions,
  expenseCategories,
  incomeCategories,
  savingCategories,
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
  const slidesRef = useRef(slides);
  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  const loadMonthData = useCallback(async (month: string, index: number) => {
    try {
      const data = await getTransactionsByMonth(month);
      setSlides((prev) => {
        const newSlides = [...prev];
        if (!data.data) return prev;
        newSlides[index] = { month, transactions: data.data };
        return newSlides;
      });
      return data.data || [];
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      return [];
    }
  }, []);

  // 현재 월 데이터 다시 로드하는 함수
  const refetchCurrentMonth = useCallback(async () => {
    if (!api) return;

    const currentIndex = api.selectedScrollSnap();
    const currentSlide = slidesRef.current[currentIndex];

    if (currentSlide) {
      await loadMonthData(currentSlide.month, currentIndex);
    }
  }, [api, loadMonthData]);

  useEffect(() => {
    if (!api) return;

    const onSelect = async () => {
      if (skipScrollRef.current) {
        skipScrollRef.current = false;
        return;
      }

      const index = api.selectedScrollSnap();
      const selectedSlide = slidesRef.current[index];
      let currentTransactions = selectedSlide.transactions;

      if (selectedSlide.transactions.length === 0) {
        currentTransactions =
          (await loadMonthData(selectedSlide.month, index)) || [];
      }

      if (index === 0) {
        const newPrevMonth = dayjs(selectedSlide.month)
          .subtract(1, "month")
          .format("YYYY-MM");

        setSlides([
          { month: newPrevMonth, transactions: [] },
          {
            month: selectedSlide.month,
            transactions: currentTransactions,
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
            transactions: currentTransactions,
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
  }, [api, loadMonthData]);

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

      <CategorySummary month={slides[1].month} />

      <CalendarBottomSheet
        open={isBottomSheetOpen}
        onOpenChange={setIsBottomSheetOpen}
        selectedDate={selectedDate}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
        savingCategories={savingCategories}
        onTransactionChange={refetchCurrentMonth}
      />
    </>
  );
}
