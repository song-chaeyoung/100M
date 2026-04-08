import { NextResponse } from "next/server";

interface FrankfurterLatestResponse {
  amount: number;
  base: string;
  date: string;
  rates: {
    KRW?: number;
  };
}

export async function GET() {
  try {
    const upstreamResponse = await fetch(
      "https://api.frankfurter.dev/v1/latest?from=USD&to=KRW",
      {
        next: { revalidate: 60 * 60 },
      },
    );

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: "Upstream exchange-rate response is invalid." },
        { status: 502 },
      );
    }

    const upstreamData =
      (await upstreamResponse.json()) as FrankfurterLatestResponse;
    const rate = upstreamData.rates.KRW;

    if (!Number.isFinite(rate) || !upstreamData.date) {
      return NextResponse.json(
        { error: "Exchange-rate payload is invalid." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      rate,
      date: upstreamData.date,
    });
  } catch (error) {
    console.error("[API] exchange-rate error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exchange rate." },
      { status: 500 },
    );
  }
}
