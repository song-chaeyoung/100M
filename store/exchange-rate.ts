import { create } from "zustand";

interface ExchangeRateState {
  rate: number | null; // USD → KRW 환율
  date: string | null; // ECB 기준 날짜 (YYYY-MM-DD)
  isLoading: boolean;
  error: string | null;
  fetchRate: () => Promise<void>;
}

export const useExchangeRateStore = create<ExchangeRateState>((set, get) => ({
  rate: null,
  date: null,
  isLoading: false,
  error: null,

  fetchRate: async () => {
    // 이미 로드된 경우 재호출 방지
    if (get().rate !== null || get().isLoading) return;

    set({ isLoading: true, error: null });

    try {
      const res = await fetch(
        "https://api.frankfurter.app/latest?from=USD&to=KRW",
      );
      if (!res.ok) throw new Error("환율 조회 실패");

      const data = (await res.json()) as {
        amount: number;
        base: string;
        date: string;
        rates: { KRW: number };
      };

      set({
        rate: data.rates.KRW,
        date: data.date,
        isLoading: false,
      });
    } catch (err) {
      console.error("[ExchangeRate] fetch error:", err);
      set({ error: "환율 조회에 실패했습니다.", isLoading: false });
    }
  },
}));
