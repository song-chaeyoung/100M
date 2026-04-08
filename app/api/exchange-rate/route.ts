import { NextResponse } from "next/server";

interface FrankfurterLatestResponse {
  date: string;
  rates: {
    KRW: number;
  };
}

const UPSTREAM_REVALIDATE_SECONDS = 60 * 60;
const UPSTREAM_TIMEOUT_MS = 5_000;

function isFrankfurterLatestResponse(
  data: unknown,
): data is FrankfurterLatestResponse {
  if (typeof data !== "object" || data === null) return false;

  const maybeData = data as {
    date?: unknown;
    rates?: unknown;
  };
  if (typeof maybeData.date !== "string" || maybeData.date.length === 0) {
    return false;
  }
  if (typeof maybeData.rates !== "object" || maybeData.rates === null) {
    return false;
  }

  const maybeRate = (maybeData.rates as { KRW?: unknown }).KRW;
  return typeof maybeRate === "number" && Number.isFinite(maybeRate);
}

export async function GET() {
  try {
    const upstreamResponse = await fetch(
      "https://api.frankfurter.dev/v1/latest?from=USD&to=KRW",
      {
        next: { revalidate: UPSTREAM_REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      },
    );

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: "Upstream exchange-rate response is invalid." },
        { status: 502 },
      );
    }

    const upstreamData: unknown = await upstreamResponse.json();
    if (!isFrankfurterLatestResponse(upstreamData)) {
      return NextResponse.json(
        { error: "Exchange-rate payload is invalid." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      rate: upstreamData.rates.KRW,
      date: upstreamData.date,
    });
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      return NextResponse.json(
        { error: "Upstream exchange-rate request timed out." },
        { status: 504 },
      );
    }

    console.error("[API] exchange-rate error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exchange rate." },
      { status: 500 },
    );
  }
}
