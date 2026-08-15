import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import type { NewsItemDTO } from "@/lib/types";

// All three sources are US media (not South Korea domestic outlets), matching
// Chanwoo's US-based clients: 미주중앙일보/미주한국일보 are the two Korean-language
// US papers, and CNBC is the one English-language outlet — chosen over CNN
// because it's a dedicated financial/markets network rather than general news,
// a better fit for a financial advisor's morning briefing.
const FEEDS: { url: string; source: string; kind: "news" | "column"; lang: "ko" | "en" }[] = [
  { url: "https://www.koreadaily.com/rss/economy.xml", source: "미주중앙일보", kind: "news", lang: "ko" },
  { url: "https://www.koreadaily.com/rss/opinion.xml", source: "미주중앙일보", kind: "column", lang: "ko" },
  { url: "https://www.koreatimes.com/rss/economy.xml", source: "미주한국일보", kind: "news", lang: "ko" },
  { url: "https://www.koreatimes.com/rss/opinion.xml", source: "미주한국일보", kind: "column", lang: "ko" },
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", source: "CNBC", kind: "news", lang: "en" },
];

const FINANCE_KEYWORDS_KO = [
  "금리", "증시", "주식", "환율", "연준", "인플레이션", "경기", "부동산",
  "세금", "은퇴", "보험", "달러", "연금", "경제", "펀드", "투자", "관세",
  "일자리", "고용", "물가",
];

const FINANCE_KEYWORDS_EN = [
  "rate", "stock", "market", "inflation", "fed", "dollar", "economy", "tax",
  "retirement", "insurance", "bond", "yield", "tariff", "jobs", "unemployment",
  "s&p", "dow", "nasdaq", "wall street", "recession", "earnings",
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

// RSS <description> often carries raw HTML (a <p>/<img> snippet) — strip tags
// and decode the handful of entities that show up in practice so the preview
// modal shows plain text.
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
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });

  return NextResponse.json(pool.slice(0, 10));
}
