import type {
  StockHoldingResponse,
  StockPriceResponse,
} from "@/lib/validations/stock";

export interface HoldingStats {
  currentPriceKRW: number | null;
  avgPriceKRW: number;
  evalAmount: number | null;
  investAmount: number;
  profitLoss: number | null;
  profitRate: number | null;
  changeRate: number | null;
}

/**
 * 개별 종목의 평가금액 / 손익 / 수익률 계산
 */
export function calcHoldingStats(
  holding: StockHoldingResponse,
  price: StockPriceResponse | undefined,
  fallbackExchangeRate?: number | null,
): HoldingStats {
  // krwPrice가 없을 때(장 마감 등) fallbackExchangeRate(Zustand store 환율)로 계산
  const currentPriceKRW = price?.krwPrice
    ? Number(price.krwPrice)
    : price?.currentPrice && holding.currency === "USD" && fallbackExchangeRate
      ? Math.round(Number(price.currentPrice) * fallbackExchangeRate)
      : null;

  let avgPriceKRW = Number(holding.avgPrice);
  if (holding.currency === "USD") {
    const rate = price?.exchangeRate
      ? Number(price.exchangeRate)
      : (fallbackExchangeRate ?? null);
    if (rate) avgPriceKRW = avgPriceKRW * rate;
  }

  const evalAmount =
    currentPriceKRW != null ? currentPriceKRW * holding.quantity : null;
  const investAmount = avgPriceKRW * holding.quantity;
  const profitLoss = evalAmount != null ? evalAmount - investAmount : null;
  const profitRate =
    investAmount > 0 && profitLoss != null
      ? (profitLoss / investAmount) * 100
      : null;
  const changeRate = price?.changeRate ? Number(price.changeRate) : null;

  return {
    currentPriceKRW,
    avgPriceKRW,
    evalAmount,
    investAmount,
    profitLoss,
    profitRate,
    changeRate,
  };
}

export interface TotalStats {
  totalEvalKRW: number;
  totalInvestedKRW: number;
  totalProfitLoss: number;
  totalProfitRate: number;
}

/**
 * 전체 종목의 합산 평가금액 / 손익 / 수익률 계산
 * @param fallbackExchangeRate krwPrice가 없는 미국 주식에 사용할 fallback 환율
 */
export function calcTotalStats(
  holdingsWithPrices: Array<{
    holding: StockHoldingResponse;
    price: StockPriceResponse | undefined;
  }>,
  fallbackExchangeRate?: number | null,
): TotalStats {
  const totalEvalKRW = holdingsWithPrices.reduce((acc, { holding, price }) => {
    if (price?.krwPrice) {
      return acc + Number(price.krwPrice) * holding.quantity;
    }
    // krwPrice 없는 미국 주식: currentPrice × fallbackExchangeRate
    if (
      price?.currentPrice &&
      holding.currency === "USD" &&
      fallbackExchangeRate
    ) {
      return (
        acc +
        Math.round(Number(price.currentPrice) * fallbackExchangeRate) *
          holding.quantity
      );
    }
    return acc;
  }, 0);

  const totalInvestedKRW = holdingsWithPrices.reduce(
    (acc, { holding, price }) => {
      let avgPriceKRW = Number(holding.avgPrice);
      if (holding.currency === "USD") {
        const rate = price?.exchangeRate
          ? Number(price.exchangeRate)
          : (fallbackExchangeRate ?? null);
        if (rate) avgPriceKRW = avgPriceKRW * rate;
      }
      return acc + avgPriceKRW * holding.quantity;
    },
    0,
  );

  const totalProfitLoss = totalEvalKRW - totalInvestedKRW;
  const totalProfitRate =
    totalInvestedKRW > 0 ? (totalProfitLoss / totalInvestedKRW) * 100 : 0;

  return { totalEvalKRW, totalInvestedKRW, totalProfitLoss, totalProfitRate };
}
