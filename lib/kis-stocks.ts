/**
 * 한국투자증권 Open API 시세 조회 모듈
 *
 * - 국내: [국내주식] 주식현재가 시세 (FHKST01010100)
 * - 해외: [해외주식] 해외주식 현재가상세 (HHDFS00000300)
 *         장 마감 시 fallback → base(전일종가) → 일별시세(HHDFS76240000)
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
// 장 마감 fallback: last → base(전일종가) → 일별시세 API
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

// ─────────────────────────────────────────────
// 해외 주식 일별시세 API (HHDFS76240000)
// 실시간 · 전일 종가 모두 없을 때 최후 fallback
// 거래소 코드가 잘못된 경우 NYS→NAS→AMS 순으로 자동 탐색
// ─────────────────────────────────────────────

// 모든 미국 거래소 코드 (cross-exchange 탐색용)
const ALL_US_EXCDS = ["NYS", "NAS", "AMS"] as const;

interface USDailyPriceRaw {
  output2: {
    xymd: string; // 일자 (YYYYMMDD)
    clos: string; // 종가
    sign: string; // 대비 기호
    diff: string; // 대비
    rate: string; // 등락율
    open: string; // 시가
    high: string; // 고가
    low: string; // 저가
    tvol: string; // 거래량
  }[];
  rt_cd: string;
  msg_cd: string;
  msg1: string;
}

/** 단일 거래소로 일별시세 1건 조회 */
async function fetchDailyCloseFromExcd(
  stockCode: string,
  excd: string,
): Promise<{ clos: string; xymd: string } | null> {
  try {
    const headers = await getKISHeaders("HHDFS76240000");
    const params = new URLSearchParams({
      AUTH: "",
      EXCD: excd,
      SYMB: stockCode,
      GUBN: "0", // 0=일별
      BYMD: "", // 빈 값 = 오늘 기준
      MODP: "0", // 수정주가 미반영
    });

    const res = await fetch(
      `${getKISBaseUrl()}/uapi/overseas-price/v1/quotations/dailyprice?${params}`,
      { headers },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as USDailyPriceRaw;
    if (data.rt_cd !== "0") return null;

    const latest = data.output2?.find(
      (d) => d.clos && d.clos !== "" && Number(d.clos) !== 0,
    );
    return latest ? { clos: latest.clos, xymd: latest.xymd } : null;
  } catch {
    return null;
  }
}

/**
 * 일별시세 조회 — 지정 거래소 실패 시 나머지 거래소도 자동 탐색
 * @returns 종가 + 실제로 데이터를 찾은 거래소 코드
 */
async function fetchUSStockDailyClose(
  stockCode: string,
  primaryExcd: string,
): Promise<{ clos: string; xymd: string; foundExcd: string } | null> {
  // 지정 거래소를 먼저 시도, 나머지를 뒤에 붙임
  const order = [primaryExcd, ...ALL_US_EXCDS.filter((e) => e !== primaryExcd)];

  for (const excd of order) {
    const result = await fetchDailyCloseFromExcd(stockCode, excd);
    if (result) {
      if (excd !== primaryExcd) {
        console.warn(
          `[KIS] 일별시세: ${stockCode} → ${primaryExcd} 실패, ${excd} 에서 조회 성공`,
        );
      }
      return { ...result, foundExcd: excd };
    }
  }

  console.error(
    `[KIS] 일별시세 데이터 없음: ${stockCode} (모든 거래소 탐색 실패)`,
  );
  return null;
}

/** 단일 거래소로 현재가 상세 1건 조회 */
async function fetchPriceDetailFromExcd(
  stockCode: string,
  excd: string,
): Promise<USStockPriceRaw["output"] | null> {
  try {
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
    if (!res.ok) return null;
    const data = (await res.json()) as USStockPriceRaw;
    if (data.rt_cd !== "0") return null;
    // rsym(종목코드) 또는 base(전일종가)가 있으면 해당 거래소에서 종목을 찾은 것
    // ※ exrt(환율)은 장 마감 시 비어있을 수 있어 판단 기준으로 부적합
    const rsym = (data.output.rsym || "").trim();
    const base = data.output.base || "";
    const hasData = rsym !== "" || (base !== "" && Number(base) !== 0);
    return hasData ? data.output : null;
  } catch {
    return null;
  }
}

export async function fetchUSStockPrice(
  stockCode: string,
  market: "NYSE" | "NASDAQ" | "AMEX",
  fallbackName?: string,
): Promise<NewStockPrice | null> {
  try {
    const primaryExcd = MARKET_TO_EXCD[market];
    if (!primaryExcd) {
      console.error(
        `[KIS] 지원하지 않는 해외 시장: ${market} (stockCode: ${stockCode})`,
      );
      return null;
    }

    // ── 1차: 지정 거래소로 현재가 조회
    // 거래소가 잘못 저장된 경우를 대비해 cross-exchange 탐색
    const excdOrder = [
      primaryExcd,
      ...ALL_US_EXCDS.filter((e) => e !== primaryExcd),
    ];

    let output: USStockPriceRaw["output"] | null = null;
    let foundExcd = primaryExcd;

    for (const excd of excdOrder) {
      output = await fetchPriceDetailFromExcd(stockCode, excd);
      if (output) {
        if (excd !== primaryExcd) {
          console.warn(
            `[KIS] ${stockCode}: DB market=${market}(${primaryExcd}) 불일치 → 실제 거래소 ${excd} 에서 조회 성공`,
          );
        }
        foundExcd = excd;
        break;
      }
    }

    if (!output) {
      console.error(`[KIS] 현재가 조회 실패 (모든 거래소 탐색): ${stockCode}`);
      return null;
    }

    const realtimePrice = output.last;
    const basePrice = output.base; // 전일 종가
    const changeRate = output.rate;
    const stockName = (output.rsym || "").trim() || fallbackName || stockCode;
    const exchangeRate = output.exrt; // USD/KRW 환율

    // foundExcd → market 역매핑
    const EXCD_TO_MARKET: Record<string, "NYSE" | "NASDAQ" | "AMEX"> = {
      NYS: "NYSE",
      NAS: "NASDAQ",
      AMS: "AMEX",
    };
    const resolvedMarket = EXCD_TO_MARKET[foundExcd] ?? market;

    // ── 2차: 실시간 현재가 (장중)
    let currentPrice = realtimePrice;
    let isClosingPrice = false;

    // ── 3차 fallback: 전일 종가(base) — 장 마감 / 프리마켓
    if (!currentPrice || currentPrice === "" || Number(currentPrice) === 0) {
      if (basePrice && basePrice !== "" && Number(basePrice) !== 0) {
        console.warn(
          `[KIS] 실시간 시세 없음 → 전일종가(base) 사용: ${stockCode} (base: ${basePrice})`,
        );
        currentPrice = basePrice;
        isClosingPrice = true;
      } else {
        // ── 4차 fallback: 일별시세 API (HHDFS76240000)
        console.warn(`[KIS] base도 없음 → 일별시세 API 조회: ${stockCode}`);
        const daily = await fetchUSStockDailyClose(stockCode, foundExcd);
        if (!daily) {
          console.error(
            `[KIS] 해외 시세 데이터 없음: ${stockCode} (market: ${resolvedMarket})`,
          );
          return null;
        }
        currentPrice = daily.clos;
        isClosingPrice = true;
      }
    }

    if (isClosingPrice) {
      console.log(
        `[KIS] ${stockCode} 전일종가 사용: $${currentPrice} (장 마감 또는 프리마켓)`,
      );
    }

    // KRW 환산가 계산
    const krwPrice =
      exchangeRate && currentPrice
        ? String(Math.round(Number(currentPrice) * Number(exchangeRate)))
        : null;

    return {
      stockCode,
      stockName,
      market: resolvedMarket, // 실제로 조회된 거래소로 보정
      country: "US",
      currentPrice,
      previousClose: basePrice || currentPrice,
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
