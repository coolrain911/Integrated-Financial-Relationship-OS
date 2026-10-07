import { NextResponse } from "next/server";
import type { MarketIndexDTO } from "@/lib/types";

// Yahoo Finance's unauthenticated chart endpoint — no API key needed, and
// widely relied upon by tools like yfinance. Undocumented, so a fetch
// failure here is treated as "no data" rather than surfaced as an error;
// the dashboard just shows a dash for that index.
const SYMBOLS: { symbol: string; name: string; unit: string | null }[] = [
  { symbol: "^GSPC", name: "S&P 500", unit: null },
  { symbol: "^DJI", name: "Dow Jones", unit: null },
  { symbol: "^IXIC", name: "Nasdaq", unit: null },
  { symbol: "GC=F", name: "Gold", unit: null },
  { symbol: "TSLA", name: "Tesla", unit: null },
  { symbol: "PLTR", name: "Palantir", unit: null },
  { symbol: "NVDA", name: "Nvidia", unit: null },
  { symbol: "^KS11", name: "KOSPI", unit: null },
  { symbol: "BTC-USD", name: "Bitcoin", unit: null },
  { symbol: "XRP-USD", name: "XRP", unit: null },
  // CBOE 10-Year Treasury Note Yield Index — Yahoo already reports this as
  // the yield itself in percent (e.g. 4.16 means 4.16%), not the raw
  // CBOE index value (which would be the yield x10).
  { symbol: "^TNX", name: "US 10Y Treasury", unit: "%" },
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

// US CPI (All Urban Consumers, seasonally adjusted) year-over-year % change
// — the standard headline "inflation rate". FRED's CSV export needs no API
// key. The series is monthly, not daily, so there's no meaningful
// day-over-day change for it (left null; the dashboard shows a dash).
async function fetchInflationRate(): Promise<{ value: number; asOfDate: string } | null> {
  try {
    const url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCSL";
    const res = await fetch(url, { next: { revalidate: 21600 } });
    if (!res.ok) return null;

    const text = await res.text();
    const rows = text
      .trim()
      .split("\n")
      .slice(1)
      .map((line) => {
        const [date, raw] = line.split(",");
        const value = Number(raw);
        return date && !Number.isNaN(value) ? { date, value } : null;
      })
      .filter((r): r is { date: string; value: number } => r !== null);
    if (rows.length < 13) return null;

    const latest = rows[rows.length - 1];
    const yearAgoTarget = new Date(latest.date);
    yearAgoTarget.setUTCFullYear(yearAgoTarget.getUTCFullYear() - 1);
    let yearAgo = rows[0];
    for (const r of rows) {
      if (new Date(r.date).getTime() <= yearAgoTarget.getTime()) yearAgo = r;
      else break;
    }
    if (yearAgo === latest) return null;

    return {
      value: ((latest.value - yearAgo.value) / yearAgo.value) * 100,
      asOfDate: latest.date,
    };
  } catch {
    return null;
  }
}

// Freddie Mac 30-Year Fixed Rate Mortgage Average (PMMS), published weekly
// (Thursdays) — via the same unauthenticated FRED CSV export. Reports the
// rate itself (not a YoY transform like the CPI row above), so the 1yr
// column is the relative % change of the rate versus ~52 weeks ago, same
// convention as the 10Y Treasury row. No day-over-day change since it isn't
// a daily series.
async function fetchMortgageRate(): Promise<{
  value: number;
  asOfDate: string;
  changePct1y: number | null;
} | null> {
  try {
    const url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US";
    const res = await fetch(url, { next: { revalidate: 21600 } });
    if (!res.ok) return null;

    const text = await res.text();
    const rows = text
      .trim()
      .split("\n")
      .slice(1)
      .map((line) => {
        const [date, raw] = line.split(",");
        const value = Number(raw);
        return date && !Number.isNaN(value) ? { date, value } : null;
      })
      .filter((r): r is { date: string; value: number } => r !== null);
    if (!rows.length) return null;

    const latest = rows[rows.length - 1];
    const yearAgoTarget = new Date(latest.date);
    yearAgoTarget.setUTCFullYear(yearAgoTarget.getUTCFullYear() - 1);
    let yearAgo = rows[0];
    for (const r of rows) {
      if (new Date(r.date).getTime() <= yearAgoTarget.getTime()) yearAgo = r;
      else break;
    }

    return {
      value: latest.value,
      asOfDate: latest.date,
      changePct1y: yearAgo !== latest ? ((latest.value - yearAgo.value) / yearAgo.value) * 100 : null,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const [indexResults, inflation, mortgage] = await Promise.all([
    Promise.all(
      SYMBOLS.map(async ({ symbol, name, unit }) => {
        const data = await fetchIndex(symbol);
        return {
          symbol,
          name,
          value: data?.value ?? null,
          changePct1d: data?.changePct1d ?? null,
          changePct1y: data?.changePct1y ?? null,
          asOfDate: data?.asOfDate ?? null,
          unit,
        };
      })
    ),
    fetchInflationRate(),
    fetchMortgageRate(),
  ]);

  const results: MarketIndexDTO[] = [
    ...indexResults,
    {
      symbol: "CPIAUCSL-YOY",
      name: "US CPI (Inflation)",
      value: inflation?.value ?? null,
      changePct1d: null,
      changePct1y: null,
      asOfDate: inflation?.asOfDate ?? null,
      unit: "%",
    },
    {
      symbol: "MORTGAGE30US",
      name: "US 30Y Mortgage",
      value: mortgage?.value ?? null,
      changePct1d: null,
      changePct1y: mortgage?.changePct1y ?? null,
      asOfDate: mortgage?.asOfDate ?? null,
      unit: "%",
    },
  ];

  return NextResponse.json(results);
}
