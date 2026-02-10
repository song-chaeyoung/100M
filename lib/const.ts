/** 고정지출/저축 기본 기간 (현재월 포함 N개월) */
export const DEFAULT_PERIOD_MONTHS = 12;

export const ASSET_TYPE_LABELS: Record<string, string> = {
  SAVINGS: "예금",
  DEPOSIT: "적금",
  STOCK: "주식",
  FUND: "펀드",
  CRYPTO: "암호화폐",
  REAL_ESTATE: "부동산",
  OTHER: "기타",
};

export const ASSET_TYPE_ICONS: Record<string, string> = {
  SAVINGS: "🏦",
  DEPOSIT: "💰",
  STOCK: "📈",
  FUND: "📊",
  CRYPTO: "🪙",
  REAL_ESTATE: "🏠",
  OTHER: "💼",
};

export const ASSET_TYPE_OPTIONS = [
  { value: "SAVINGS", label: "예금", icon: "🏦" },
  { value: "DEPOSIT", label: "적금", icon: "💰" },
  { value: "STOCK", label: "주식", icon: "📈" },
  { value: "FUND", label: "펀드", icon: "📊" },
  { value: "CRYPTO", label: "암호화폐", icon: "🪙" },
  { value: "REAL_ESTATE", label: "부동산", icon: "🏠" },
  { value: "OTHER", label: "기타", icon: "💼" },
];
