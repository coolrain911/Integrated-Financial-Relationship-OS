import { NextResponse } from "next/server";
import type { MarketIndexDTO } from "@/lib/types";

// Yahoo Finance's unauthenticated chart endpoint — no API key needed, and
// widely relied upon by tools like yfinance. Undocumented, so a fetch
// failure here is treated as "no data" rather than surfaced as an error;
// the dashboard just shows a dash for that index.
const SYMBOLS: { symbol: string; name: string }[] = [
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^DJI", name: "Dow Jones" },
  { symbol: "^IXIC", name: "Nasdaq" },
  { symbol: "GC=F", name: "Gold" },
];

type YahooChartResponse = {
  chart?: {
    result?: {
      timestamp?: number[];
      indicators?: { quote?: { close?: (number | null)[] }[] };
    }[];
  };
};

type IndexData = {
  value: number;
  asOfDate: string;
  changePct1d: number | null;
  changePct1y: number | null;
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

async function fetchIndex(symbol: string): Promise<IndexData | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2y&interval=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FINOS-dashboard/1.0)" },
      next: { revalidate: 21600 },
    });
    if (!res.ok) return null;

    const json: YahooChartResponse = await res.json();
    const result = json.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    if (!timestamps.length || !closes.length) return null;

    const rows = timestamps
      .map((t, i) => ({ date: new Date(t * 1000), close: closes[i] }))
      .filter((r): r is { date: Date; close: number } => typeof r.close === "number");
    if (!rows.length) return null;

    const latest = rows[rows.length - 1];
    const prev = rows.length >= 2 ? rows[rows.length - 2] : null;

    const oneYearTarget = new Date(latest.date);
    oneYearTarget.setUTCFullYear(oneYearTarget.getUTCFullYear() - 1);
    let yearAgoRow = rows[0];
    for (const r of rows) {
      if (r.date.getTime() <= oneYearTarget.getTime()) yearAgoRow = r;
      else break;
    }

    return {
      value: latest.close,
      asOfDate: `${latest.date.getUTCFullYear()}-${pad2(latest.date.getUTCMonth() + 1)}-${pad2(latest.date.getUTCDate())}`,
      changePct1d: prev ? ((latest.close - prev.close) / prev.close) * 100 : null,
      changePct1y:
        yearAgoRow !== latest ? ((latest.close - yearAgoRow.close) / yearAgoRow.close) * 100 : null,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const results: MarketIndexDTO[] = await Promise.all(
    SYMBOLS.map(async ({ symbol, name }) => {
      const data = await fetchIndex(symbol);
      return {
        symbol,
        name,
        value: data?.value ?? null,
        changePct1d: data?.changePct1d ?? null,
        changePct1y: data?.changePct1y ?? null,
        asOfDate: data?.asOfDate ?? null,
      };
    })
  );

  return NextResponse.json(results);
}
