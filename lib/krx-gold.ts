type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

const CLOSE_PRICE_KEYS = [
  "closeprice",
  "closingprice",
  "close",
  "clpr",
  "clsprc",
  "tdd_clsprc",
  "tddclsprc",
  "closing_prc",
  "종가",
];

const CURRENT_PRICE_KEYS = [
  "currentprice",
  "price",
  "prc",
  "last",
  "현재가",
  "시세",
];

const DATE_KEYS = [
  "basdd",
  "bas_dd",
  "pricedate",
  "basedate",
  "baseday",
  "bizdate",
  "trade_date",
  "tradedate",
  "일자",
  "기준일",
  "date",
];

const UNIT_KEYS = ["unit", "priceunit", "qtyunit", "price_unit", "단위"];
const KRX_FETCH_TIMEOUT_MS = 10_000;

export interface ParsedKRXGoldPrice {
  pricePerGram: number;
  priceDate: string;
  isKgConverted: boolean;
}

interface CandidatePrice {
  price: number;
  priceDate: string | null;
  isClosePrice: boolean;
  isKg: boolean;
  matchedKey: string;
}

function getKSTDate(offsetDays: number = 0): string {
  const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000);
  kstDate.setUTCDate(kstDate.getUTCDate() + offsetDays);
  return kstDate.toISOString().split("T")[0];
}

function getTodayKST(): string {
  return getKSTDate(0);
}

function getYesterdayKST(): string {
  return getKSTDate(-1);
}

function normalizeKey(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\s_\-()[\]]/g, "")
    .trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") return null;
  const normalized = value
    .trim()
    .replace(/,/g, "")
    .replace(/원|krw|KRW/g, "");

  if (normalized === "") return null;

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseDate(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  return null;
}

function getUnit(record: Record<string, unknown>): "g" | "kg" | null {
  for (const [key, value] of Object.entries(record)) {
    if (!UNIT_KEYS.includes(normalizeKey(key))) continue;
    if (typeof value !== "string") continue;

    const normalized = value.toLowerCase();
    if (normalized.includes("kg") || normalized.includes("킬로")) return "kg";
    if (normalized.includes("g") || normalized.includes("그램")) return "g";
  }
  return null;
}

function findByKeys(
  record: Record<string, unknown>,
  keys: string[],
): { key: string; value: unknown } | null {
  const normalized = Object.entries(record).map(([key, value]) => ({
    originalKey: key,
    normalizedKey: normalizeKey(key),
    value,
  }));

  for (const target of keys.map(normalizeKey)) {
    const hit = normalized.find(({ normalizedKey }) => normalizedKey === target);
    if (hit) {
      return { key: hit.originalKey, value: hit.value };
    }
  }

  return null;
}

function collectRecords(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectRecords(item));
  }

  const record = asRecord(value);
  if (!record) return [];

  const children = Object.values(record).flatMap((item) =>
    collectRecords(item),
  );
  return [record, ...children];
}

function buildCandidate(
  record: Record<string, unknown>,
): CandidatePrice | null {
  const closePrice = findByKeys(record, CLOSE_PRICE_KEYS);
  const currentPrice = findByKeys(record, CURRENT_PRICE_KEYS);

  const picked = closePrice ?? currentPrice;
  if (!picked) return null;

  const rawPrice = parseNumber(picked.value);
  if (!rawPrice || rawPrice <= 0) return null;

  const dateMatch = findByKeys(record, DATE_KEYS);
  const parsedDate = dateMatch ? parseDate(dateMatch.value) : null;

  const unitFromField = getUnit(record);
  const keySuggestsKg = normalizeKey(picked.key).includes("kg");

  const isKg =
    unitFromField === "kg" ||
    keySuggestsKg ||
    (unitFromField === null && rawPrice >= 1_000_000);

  return {
    price: rawPrice,
    priceDate: parsedDate,
    isClosePrice: Boolean(closePrice),
    isKg,
    matchedKey: picked.key,
  };
}

export function parseKRXGoldPriceResponse(
  payload: unknown,
  fallbackDate: string = getTodayKST(),
): ParsedKRXGoldPrice {
  const candidates = collectRecords(payload)
    .map((record) => buildCandidate(record))
    .filter((candidate): candidate is CandidatePrice => candidate !== null);

  if (candidates.length === 0) {
    throw new Error("KRX 금 시세 응답에서 가격 필드를 찾지 못했습니다.");
  }

  const sorted = candidates.sort((a, b) => {
    const dateA = a.priceDate ?? "";
    const dateB = b.priceDate ?? "";
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    if (a.isClosePrice !== b.isClosePrice) return a.isClosePrice ? -1 : 1;
    return 0;
  });

  const selected = sorted[0];
  const converted = selected.isKg ? selected.price / 1000 : selected.price;

  if (!Number.isFinite(converted) || converted <= 0) {
    throw new Error(`KRX 금 시세 파싱 실패 (key: ${selected.matchedKey})`);
  }

  return {
    pricePerGram: Number(converted.toFixed(2)),
    priceDate: selected.priceDate ?? fallbackDate,
    isKgConverted: selected.isKg,
  };
}

export interface FetchKRXGoldPriceResult extends ParsedKRXGoldPrice {
  rawPayload: string;
}

export async function fetchKRXGoldPrice(): Promise<FetchKRXGoldPriceResult> {
  const authKey = process.env.KRX_OPENAPI_AUTH_KEY;
  const apiUrl =
    process.env.KRX_GOLD_API_URL ??
    "https://data-dbg.krx.co.kr/svc/apis/gen/gold_bydd_trd";

  if (!authKey) {
    throw new Error("KRX_OPENAPI_AUTH_KEY 환경변수가 설정되지 않았습니다.");
  }

  const fallbackDate = getYesterdayKST();
  const basDd = fallbackDate.replace(/-/g, "");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, KRX_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        AUTH_KEY: authKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ basDd }),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("KRX API 요청 시간이 초과되었습니다.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`KRX API 호출 실패 (${response.status}): ${body}`);
  }

  const rawPayload = await response.text();

  let parsedJson: JsonValue;
  try {
    parsedJson = JSON.parse(rawPayload) as JsonValue;
  } catch {
    throw new Error("KRX API 응답이 JSON 형식이 아닙니다.");
  }

  const parsed = parseKRXGoldPriceResponse(parsedJson, fallbackDate);
  return {
    ...parsed,
    rawPayload,
  };
}
