import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import type { NewsItemDTO } from "@/lib/types";

// Scoped to Korean-language outlets Chanwoo actually reads, and filtered to
// financial/economic keywords — pulling in general Korean news would bury
// the handful of stories relevant to a financial advisor's morning briefing.
const FEEDS: { url: string; source: string }[] = [
  { url: "https://www.chosun.com/arc/outboundfeeds/rss/category/economy/?outputType=xml", source: "조선일보" },
  { url: "https://rss.hankookilbo.com/feed/economy.xml", source: "한국일보" },
  { url: "https://www.koreadaily.com/rss/economy.xml", source: "미주중앙일보" },
];

const FINANCE_KEYWORDS = [
  "금리", "증시", "주식", "환율", "연준", "인플레이션", "경기", "부동산",
  "세금", "은퇴", "보험", "달러", "연금", "경제", "펀드", "투자", "관세",
  "일자리", "고용", "물가",
];

type RssItem = { title?: unknown; link?: unknown; pubDate?: unknown };
type RssFeed = { rss?: { channel?: { item?: RssItem | RssItem[] } } };

function textOf(raw: unknown): string {
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "number") return String(raw);
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj["@_href"] === "string") return obj["@_href"].trim();
    if (typeof obj["#text"] === "string") return obj["#text"].trim();
  }
  return "";
}

function matchesFinance(title: string): boolean {
  return FINANCE_KEYWORDS.some((k) => title.includes(k));
}

async function fetchFeed(feed: { url: string; source: string }): Promise<NewsItemDTO[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FINOS-dashboard/1.0)" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const parsed = parser.parse(xml) as RssFeed;
    const raw = parsed.rss?.channel?.item ?? [];
    const items = Array.isArray(raw) ? raw : [raw];

    return items
      .map((item) => {
        const title = textOf(item.title);
        const link = textOf(item.link);
        const pubDate = textOf(item.pubDate);
        const parsedDate = pubDate ? new Date(pubDate) : null;
        return {
          title,
          link,
          source: feed.source,
          publishedAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
        };
      })
      .filter((n) => n.title && n.link);
  } catch {
    return [];
  }
}

export async function GET() {
  const feedResults = await Promise.all(FEEDS.map(fetchFeed));
  const all = feedResults.flat();

  const financial = all.filter((n) => matchesFinance(n.title));
  // Fall back to the unfiltered pool if the keyword filter happens to leave
  // nothing (e.g. a quiet news day) — an empty "Daily Financial News" card
  // is worse than a slightly-broader one.
  const pool = financial.length ? financial : all;

  pool.sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });

  return NextResponse.json(pool.slice(0, 10));
}
