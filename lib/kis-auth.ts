/**
 * 한국투자증권 Open API 인증 모듈
 * kis_auth.py 로직을 TypeScript로 포팅
 *
 * - 실전투자: https://openapi.koreainvestment.com:9443
 * - 모의투자: https://openapivts.koreainvestment.com:29443
 */

const REAL_BASE_URL = "https://openapi.koreainvestment.com:9443";
const PAPER_BASE_URL = "https://openapivts.koreainvestment.com:29443";

function getBaseUrl(): string {
  return process.env.KIS_IS_PAPER === "true" ? PAPER_BASE_URL : REAL_BASE_URL;
}

export function getKISBaseUrl(): string {
  return getBaseUrl();
}

// ─────────────────────────────────────────────
// 토큰 캐시 (서버 메모리)
// ─────────────────────────────────────────────

interface TokenCache {
  accessToken: string;
  expiresAt: number; // Unix timestamp (ms)
}

let tokenCache: TokenCache | null = null;

/**
 * Access Token 발급
 * - 캐시가 있고 만료 10분 전까지는 캐시 반환
 * - 만료 임박 or 없으면 새로 발급
 */
export async function getKISToken(): Promise<string> {
  const now = Date.now();
  const TEN_MIN = 10 * 60 * 1000;

  // 캐시 유효 확인
  if (tokenCache && tokenCache.expiresAt - TEN_MIN > now) {
    return tokenCache.accessToken;
  }

  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  if (!appKey || !appSecret) {
    throw new Error(
      "KIS_APP_KEY 또는 KIS_APP_SECRET 환경변수가 설정되지 않았습니다.",
    );
  }

  const res = await fetch(`${getBaseUrl()}/oauth2/tokenP`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: appKey,
      appsecret: appSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KIS 토큰 발급 실패 (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number; // seconds
    access_token_token_expired: string;
  };

  const expiresAt = now + data.expires_in * 1000;

  tokenCache = {
    accessToken: data.access_token,
    expiresAt,
  };

  return tokenCache.accessToken;
}

/**
 * KIS API 공통 헤더 생성
 */
export async function getKISHeaders(
  trId: string,
  extra?: Record<string, string>,
): Promise<Record<string, string>> {
  const token = await getKISToken();
  const appKey = process.env.KIS_APP_KEY!;
  const appSecret = process.env.KIS_APP_SECRET!;

  return {
    "Content-Type": "application/json; charset=utf-8",
    Authorization: `Bearer ${token}`,
    appkey: appKey,
    appsecret: appSecret,
    tr_id: trId,
    custtype: "P", // 개인
    ...extra,
  };
}
