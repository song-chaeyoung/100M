import { describe, it, expect } from "vitest";
import { generateCalendarDays } from "@/lib/calendar-utils";

describe("generateCalendarDays", () => {
  it("35~42개의 날짜를 반환한다 (캘린더 그리드)", () => {
    const days = generateCalendarDays("2025-01");

    // 캘린더는 주 단위(7일)로 채워야 하므로 35~42개
    expect(days.length).toBeGreaterThanOrEqual(35);
    expect(days.length).toBeLessThanOrEqual(42);

    // 7의 배수여야 함 (주 단위 그리드)
    expect(days.length % 7).toBe(0);
  });

  it("각 날짜 객체가 올바른 구조를 가진다", () => {
    const days = generateCalendarDays("2025-06");
    const firstDay = days[0];

    // 모든 날짜 객체는 이 3개 필드가 있어야 함
    expect(firstDay).toHaveProperty("date"); // "2025-05-25" 같은 문자열
    expect(firstDay).toHaveProperty("isCurrentMonth"); // 해당 월인지
    expect(firstDay).toHaveProperty("isToday"); // 오늘인지
  });

  it("해당 월의 모든 날짜가 포함된다", () => {
    const days = generateCalendarDays("2025-02");

    // 2025년 2월은 28일
    const februaryDays = days.filter((d) => d.isCurrentMonth);
    expect(februaryDays.length).toBe(28);
  });

  it("이전/다음 달 날짜도 포함된다 (빈 칸 채우기)", () => {
    const days = generateCalendarDays("2025-06");

    // isCurrentMonth가 false인 날짜 = 이전/다음 달
    const otherMonthDays = days.filter((d) => !d.isCurrentMonth);
    expect(otherMonthDays.length).toBeGreaterThan(0);
  });

  it("날짜가 YYYY-MM-DD 형식이다", () => {
    const days = generateCalendarDays("2025-03");

    // 정규식으로 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    days.forEach((day) => {
      expect(day.date).toMatch(dateRegex);
    });
  });
});
