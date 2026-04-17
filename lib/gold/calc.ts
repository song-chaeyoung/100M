export function calculateGoldTradeAmount(gram: number, pricePerGram: number) {
  return Math.round(gram * pricePerGram);
}

export function calculateWeightedAverageGoldBuyPrice(
  currentGram: number,
  currentAvgBuyPrice: number,
  buyGram: number,
  buyPricePerGram: number,
) {
  const nextGram = currentGram + buyGram;
  if (nextGram <= 0) return 0;

  return (
    (currentGram * currentAvgBuyPrice + buyGram * buyPricePerGram) / nextGram
  );
}

export function calculateGoldRealizedProfit(
  avgBuyPricePerGram: number,
  sellPricePerGram: number,
  sellGram: number,
) {
  return Math.round((sellPricePerGram - avgBuyPricePerGram) * sellGram);
}
