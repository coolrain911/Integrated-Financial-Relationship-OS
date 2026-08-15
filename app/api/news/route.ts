import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import type { NewsItemDTO } from "@/lib/types";

// 미주중앙일보/미주한국일보 go through Google News' `site:` search RSS rather than
// guessing each publisher's own RSS path — a much more reliable, well-documented
// endpoint that works for any domain. CNBC keeps its own official feed (already
// confirmed working). All three are US media, matching Chanwoo's US-based
// clients — CNBC was chosen over CNN as the one English outlet because it's a
// dedicated financial/markets network rather than general news.
function googleNewsRss(query: string): string {
  const params = new URLSearchParams({ q: query, hl: "ko", gl: "US", ceid: "US:ko" });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

const FEEDS: { url: string; source: string; kind: "news" | "column"; lang: "ko" | "en" }[] = [
  { url: googleNewsRss("site:koreadaily.com when:3d"), source: "미주중앙일보", kind: "news", lang: "ko" },
  {
    url: googleNewsRss("site:koreadaily.com (칼럼 OR 오피니언) when:7d"),
    source: "미주중앙일보",
    kind: "column",
    lang: "ko",
  },
  { url: googleNewsRss("site:koreatimes.com when:3d"), source: "미주한국일보", kind: "news", lang: "ko" },
  {
    url: googleNewsRss("site:koreatimes.com (칼럼 OR 오피니언) when:7d"),
    source: "미주한국일보",
    kind: "column",
    lang: "ko",
  },
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", source: "CNBC", kind: "news", lang: "en" },
];

const FINANCE_KEYWORDS_KO = [
  "금리", "증시", "주식", "환율", "연준", "인플레이션", "경기", "부동산",
  "세금", "은퇴", "보험", "달러", "연금", "경제", "펀드", "투자", "관세",
  "일자리", "고용", "물가",
];

// English articles are additionally ranked by topic once matched: macro
// finance (inflation/jobs/growth) first, then stocks/bonds, then
// insurance/long-term care — reflecting what matters most to Chanwoo's
// clients — with everything else that merely mentions a general finance term
// (tax, dollar, ...) ranked last among English items.
const EN_TIER1_MACRO = [
  "inflation", "unemployment", "jobless", "gdp", "growth", "recession",
  "fed", "federal reserve", "interest rate", "rate hike", "rate cut", "jobs report",
];
const EN_TIER2_MARKETS = [
  "stock", "stocks", "bond", "bonds", "yield", "s&p", "dow", "nasdaq",
  "earnings", "wall street", "market",
];
const EN_TIER3_INSURANCE = [
  "insurance", "long-term care", "long term care", "annuity", "life insurance",
  "medicare", "retirement",
];
const FINANCE_KEYWORDS_EN = [
  ...EN_TIER1_MACRO,
  ...EN_TIER2_MARKETS,
  ...EN_TIER3_INSURANCE,
  "rate", "dollar", "economy", "tax", "tariff", "jobs",
];

type RssItem = { title?: unknown; link?: unknown; pubDate?: unknown; description?: unknown };
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

// RSS <description> often carries raw HTML (a <p>/<img> snippet, or Google
// News' "<a href=...>title</a>&nbsp;source" format) — strip tags and decode
// the handful of entities that show up in practice so the preview modal shows
// plain text.
function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesFinance(title: string, lang: "ko" | "en"): boolean {
  const keywords = lang === "en" ? FINANCE_KEYWORDS_EN : FINANCE_KEYWORDS_KO;
  const haystack = lang === "en" ? title.toLowerCase() : title;
  return keywords.some((k) => haystack.includes(k));
}

// 0 = Korean (always first), 1-3 = English by topic tier, 4 = other English.
function priorityGroup(item: NewsItemDTO): number {
  if (item.lang === "ko") return 0;
  const text = `${item.title} ${item.description ?? ""}`.toLowerCase();
  if (EN_TIER1_MACRO.some((k) => text.includes(k))) return 1;
  if (EN_TIER2_MARKETS.some((k) => text.includes(k))) return 2;
  if (EN_TIER3_INSURANCE.some((k) => text.includes(k))) return 3;
  return 4;
}

async function fetchFeed(feed: (typeof FEEDS)[number]): Promise<NewsItemDTO[]> {
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
        const description = stripHtml(textOf(item.description));
        const parsedDate = pubDate ? new Date(pubDate) : null;
        return {
          title,
          link,
          source: feed.source,
          kind: feed.kind,
          lang: feed.lang,
          description: description || null,
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

  const financial = all.filter((n) => matchesFinance(n.title, n.lang));
  // Fall back to the unfiltered pool if the keyword filter happens to leave
  // nothing (e.g. a quiet news day) — an empty "Daily Financial News" card
  // is worse than a slightly-broader one.
  const pool = financial.length ? financial : all;

  pool.sort((a, b) => {
    const pa = priorityGroup(a);
    const pb = priorityGroup(b);
    if (pa !== pb) return pa - pb;
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });

  return NextResponse.json(pool.slice(0, 10));
}
