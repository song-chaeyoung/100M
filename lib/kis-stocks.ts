/**
 * 한국투자증권 Open API 시세 조회 모듈
 *
 * - 국내: [국내주식] 주식현재가 시세 (FHKST01010100)
 * - 해외: [해외주식] 해외주식 현재가상세 (HHDFS00000300)
 */

import { getKISBaseUrl, getKISHeaders } from "./kis-auth";
import type { NewStockPrice } from "@/db/schema";

// ─────────────────────────────────────────────
// Rate Limit 큐 (초당 최대 15건)
// ─────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithRateLimit<T>(
  tasks: (() => Promise<T>)[],
  perSecondLimit = 15,
): Promise<T[]> {
  const results: T[] = [];
  const intervalMs = 1000 / perSecondLimit;

  for (const task of tasks) {
    const start = Date.now();
    results.push(await task());
    const elapsed = Date.now() - start;
    const wait = intervalMs - elapsed;
    if (wait > 0) await delay(wait);
  }

  return results;
}

// ─────────────────────────────────────────────
// 오늘 날짜 (YYYY-MM-DD)
// ─────────────────────────────────────────────

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

// ─────────────────────────────────────────────
// 국내 주식 시세 조회
// ─────────────────────────────────────────────

interface KRStockPriceRaw {
  output: {
    stck_prpr: string; // 주식 현재가
    stck_sdpr: string; // 주식 기준가 (전일 종가)
    prdy_ctrt: string; // 전일 대비율
    hts_kor_isnm: string; // 종목명
    stck_mket_cls_cd?: string; // 시장구분
  };
  rt_cd: string;
  msg_cd: string;
  msg1: string;
}

export async function fetchKRStockPrice(
  stockCode: string,
  market: "KOSPI" | "KOSDAQ" = "KOSPI",
  fallbackName?: string,
): Promise<NewStockPrice | null> {
  try {
    const headers = await getKISHeaders("FHKST01010100");
    const params = new URLSearchParams({
      fid_cond_mrkt_div_code: "J", // J=주식
      fid_input_iscd: stockCode,
    });

    const res = await fetch(
      `${getKISBaseUrl()}/uapi/domestic-stock/v1/quotations/inquire-price?${params}`,
      { headers },
    );

    if (!res.ok) {
      console.error(`[KIS] 국내 시세 조회 실패: ${stockCode} (${res.status})`);
      return null;
    }

    const data = (await res.json()) as KRStockPriceRaw;

    if (data.rt_cd !== "0") {
      console.error(`[KIS] 국내 시세 오류: ${stockCode} - ${data.msg1}`);
      return null;
    }

    const currentPrice = data.output.stck_prpr;
    const previousClose = data.output.stck_sdpr;
    const changeRate = data.output.prdy_ctrt;
    // hts_kor_isnm이 없을 때를 대비해 holdings stockName → stockCode 순으로 fallback
    const stockName =
      (data.output.hts_kor_isnm || "").trim() || fallbackName || stockCode;

    return {
      stockCode,
      stockName,
      market,
      country: "KR",
      currentPrice,
      previousClose,
      changeRate,
      currency: "KRW",
      krwPrice: String(Math.round(Number(currentPrice))), // KRW는 동일
      exchangeRate: null,
      priceDate: getTodayString(),
    };
  } catch (err) {
    console.error(`[KIS] 국내 시세 예외: ${stockCode}`, err);
    return null;
  }
}

/**
 * 국내 주식 다건 시세 조회 (Rate Limit 큐 포함)
 */
export async function fetchKRStockPricesWithQueue(
  stocks: {
    stockCode: string;
    market: "KOSPI" | "KOSDAQ";
    stockName?: string;
  }[],
): Promise<NewStockPrice[]> {
  const tasks = stocks.map(
    ({ stockCode, market, stockName }) =>
      () =>
        fetchKRStockPrice(stockCode, market, stockName),
  );

  const results = await runWithRateLimit(tasks);
  return results.filter((r): r is NewStockPrice => r !== null);
}

// ─────────────────────────────────────────────
// 해외 주식 시세 조회 (환율 포함)
// ─────────────────────────────────────────────

// 한투 해외 거래소 코드
const MARKET_TO_EXCD: Record<string, string> = {
  NYSE: "NYS",
  NASDAQ: "NAS",
  AMEX: "AMS",
};

interface USStockPriceRaw {
  output: {
    last: string; // 현재가 (USD)
    base: string; // 전일 종가 (USD)
    rate: string; // 전일 대비율
    rsym: string; // 종목명
    curr: string; // 통화
    exrt: string; // 환율 (USD/KRW)
  };
  rt_cd: string;
  msg_cd: string;
  msg1: string;
}

export async function fetchUSStockPrice(
  stockCode: string,
  market: "NYSE" | "NASDAQ" | "AMEX",
  fallbackName?: string,
): Promise<NewStockPrice | null> {
  try {
    const excd = MARKET_TO_EXCD[market];
    const headers = await getKISHeaders("HHDFS00000300");
    const params = new URLSearchParams({
      AUTH: "",
      EXCD: excd,
      SYMB: stockCode,
    });

    const res = await fetch(
      `${getKISBaseUrl()}/uapi/overseas-price/v1/quotations/price-detail?${params}`,
      { headers },
    );

    if (!res.ok) {
      console.error(`[KIS] 해외 시세 조회 실패: ${stockCode} (${res.status})`);
      return null;
    }

    const data = (await res.json()) as USStockPriceRaw;

    if (data.rt_cd !== "0") {
      console.error(`[KIS] 해외 시세 오류: ${stockCode} - ${data.msg1}`);
      return null;
    }

    const currentPrice = data.output.last;
    const previousClose = data.output.base;
    const changeRate = data.output.rate;
    const stockName =
      (data.output.rsym || "").trim() || fallbackName || stockCode;
    const exchangeRate = data.output.exrt; // USD/KRW 환율

    // KRW 환산가 계산
    const krwPrice = exchangeRate
      ? String(Math.round(Number(currentPrice) * Number(exchangeRate)))
      : null;

    return {
      stockCode,
      stockName,
      market,
      country: "US",
      currentPrice,
      previousClose,
      changeRate,
      currency: "USD",
      krwPrice,
      exchangeRate,
      priceDate: getTodayString(),
    };
  } catch (err) {
    console.error(`[KIS] 해외 시세 예외: ${stockCode}`, err);
    return null;
  }
}

/**
 * 해외 주식 다건 시세 조회 (Rate Limit 큐 포함)
 */
export async function fetchUSStockPricesWithQueue(
  stocks: {
    stockCode: string;
    market: "NYSE" | "NASDAQ" | "AMEX";
    stockName?: string;
  }[],
): Promise<NewStockPrice[]> {
  const tasks = stocks.map(
    ({ stockCode, market, stockName }) =>
      () =>
        fetchUSStockPrice(stockCode, market, stockName),
  );

  const results = await runWithRateLimit(tasks, 10); // 해외는 더 보수적으로 10건/초
  return results.filter((r): r is NewStockPrice => r !== null);
}
