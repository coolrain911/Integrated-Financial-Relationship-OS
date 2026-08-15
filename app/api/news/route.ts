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

// The "(칼럼 OR 오피니언)" query below is only a *search strategy* to surface
// more opinion content — Google News full-text-searches the whole article,
// so it just as easily returns a plain news story that happens to mention
// "칼럼" somewhere (a related-reads sidebar, etc). It must NOT be trusted as
// the actual kind; see classifyKind() below, which decides "column" vs
// "news" from real evidence on the item itself instead.
const FEEDS: { url: string; source: string; lang: "ko" | "en" }[] = [
  { url: googleNewsRss("site:koreadaily.com when:3d"), source: "미주중앙일보", lang: "ko" },
  { url: googleNewsRss("site:koreadaily.com (칼럼 OR 오피니언) when:7d"), source: "미주중앙일보", lang: "ko" },
  { url: googleNewsRss("site:koreatimes.com when:3d"), source: "미주한국일보", lang: "ko" },
  { url: googleNewsRss("site:koreatimes.com (칼럼 OR 오피니언) when:7d"), source: "미주한국일보", lang: "ko" },
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", source: "CNBC", lang: "en" },
];

// Composition target: 5 Korean news + 2 Korean columns + 4 English — Korean
// coverage still leads (매체 요청대로), but a healthy slice of English/CNBC
// survives instead of being crowded out once the Korean feeds return plenty.
const QUOTA = { koNews: 5, koColumn: 2, en: 4 };

// "중요도"는 거시경제(금리/고용/성장) > 시장/투자 > 보험·은퇴 순으로 정의하고,
// 같은 등급 안에서는 최신순으로 정렬한다. 두 언어 모두 같은 개념을 적용.
const KO_TIER1_MACRO = [
  "금리", "기준금리", "인플레이션", "물가", "고용", "일자리", "연준",
  "경기침체", "경기둔화", "경기회복", "경기부양", "성장률",
];
const KO_TIER2_MARKETS = ["증시", "주식", "환율", "달러", "펀드", "투자", "나스닥", "다우"];
const KO_TIER3_INSURANCE = ["보험", "연금", "은퇴"];
const FINANCE_KEYWORDS_KO = [
  ...KO_TIER1_MACRO,
  ...KO_TIER2_MARKETS,
  ...KO_TIER3_INSURANCE,
  "부동산", "세금", "경제", "관세",
];

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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Plain .includes() is fine for almost every Korean keyword here — legitimate
// compounds like "뉴욕증시"/"국민연금" put the keyword right after another
// Hangul syllable, and rejecting that would lose real matches. "연준"(the Fed)
// is the one exception: it's also a common Korean given name, so "박연준"
// (a person's name) false-matches on plain .includes(). Guard only that
// keyword by requiring it not be embedded right after another Hangul
// syllable — a name (surname+given name) always has one there, while real
// usage ("연준은 금리를...", "미국 연준 의장...") never does.
function koIncludesKeyword(text: string, keyword: string): boolean {
  if (keyword === "연준") return /(?<![가-힣])연준/.test(text);
  return text.includes(keyword);
}

// English tokenizes on whitespace, so a real word-boundary regex is enough
// to stop e.g. "rate" from matching inside "corporate".
function enIncludesKeyword(text: string, keyword: string): boolean {
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i").test(text);
}

function includesKeyword(text: string, keyword: string, lang: "ko" | "en"): boolean {
  return lang === "en" ? enIncludesKeyword(text, keyword) : koIncludesKeyword(text, keyword);
}

// Korean outlets consistently prefix an opinion/column headline with a
// bracketed tag like "[칼럼]" or "[오피니언]" — a reliable, visible signal,
// unlike the search query that found the item. Defaults to "news" so an
// ordinary story never gets mislabeled just because it turned up under the
// column search; a real column without the bracket is the rarer, safer
// miss to make.
function classifyKind(title: string, link: string): "news" | "column" {
  const bracketed = ["[칼럼]", "[오피니언]", "[사설]"];
  if (bracketed.some((tag) => title.includes(tag))) return "column";
  if (/\/(opinion|column)\//i.test(link)) return "column";
  return "news";
}

function matchesFinance(item: NewsItemDTO): boolean {
  const keywords = item.lang === "en" ? FINANCE_KEYWORDS_EN : FINANCE_KEYWORDS_KO;
  return keywords.some((k) => includesKeyword(item.title, k, item.lang));
}

// 1 = macro finance, 2 = markets/investment, 3 = insurance/retirement, 4 = other.
function importanceTier(item: NewsItemDTO): number {
  const text = `${item.title} ${item.description ?? ""}`;
  const tier1 = item.lang === "en" ? EN_TIER1_MACRO : KO_TIER1_MACRO;
  const tier2 = item.lang === "en" ? EN_TIER2_MARKETS : KO_TIER2_MARKETS;
  const tier3 = item.lang === "en" ? EN_TIER3_INSURANCE : KO_TIER3_INSURANCE;
  if (tier1.some((k) => includesKeyword(text, k, item.lang))) return 1;
  if (tier2.some((k) => includesKeyword(text, k, item.lang))) return 2;
  if (tier3.some((k) => includesKeyword(text, k, item.lang))) return 3;
  return 4;
}

function byImportanceThenRecency(a: NewsItemDTO, b: NewsItemDTO): number {
  const ta = importanceTier(a);
  const tb = importanceTier(b);
  if (ta !== tb) return ta - tb;
  const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
  const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
  return db - da;
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
          kind: classifyKind(title, link),
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

  // The plain-news and column searches for the same outlet can both surface
  // the same article — de-dupe by link before anything else.
  const seenLinks = new Set<string>();
  const all = feedResults.flat().filter((n) => {
    if (seenLinks.has(n.link)) return false;
    seenLinks.add(n.link);
    return true;
  });

  // Deliberately no "fall back to the unfiltered pool" here — a shorter list
  // of genuinely relevant stories beats padding it out with whatever else a
  // feed happened to return (obituaries, unrelated local news, ...).
  const financial = all.filter(matchesFinance);

  const koNews = financial.filter((n) => n.lang === "ko" && n.kind === "news").sort(byImportanceThenRecency);
  const koColumn = financial.filter((n) => n.lang === "ko" && n.kind === "column").sort(byImportanceThenRecency);
  const en = financial.filter((n) => n.lang === "en").sort(byImportanceThenRecency);

  const koNewsPicked = koNews.slice(0, QUOTA.koNews);
  const koColumnPicked = koColumn.slice(0, QUOTA.koColumn);
  const enPicked = en.slice(0, QUOTA.en);

  // If a category came up short of its quota, backfill the leftover slots
  // from whichever category has surplus, so a quiet day for one source
  // doesn't shrink the whole briefing below what's actually available.
  const target = QUOTA.koNews + QUOTA.koColumn + QUOTA.en;
  let used = koNewsPicked.length + koColumnPicked.length + enPicked.length;
  const leftovers = [
    koNews.slice(koNewsPicked.length),
    koColumn.slice(koColumnPicked.length),
    en.slice(enPicked.length),
  ].flat();
  leftovers.sort(byImportanceThenRecency);
  for (const item of leftovers) {
    if (used >= target) break;
    if (item.lang === "ko" && item.kind === "news") koNewsPicked.push(item);
    else if (item.lang === "ko" && item.kind === "column") koColumnPicked.push(item);
    else enPicked.push(item);
    used += 1;
  }

  koNewsPicked.sort(byImportanceThenRecency);
  koColumnPicked.sort(byImportanceThenRecency);
  enPicked.sort(byImportanceThenRecency);

  const result = [...koNewsPicked, ...koColumnPicked, ...enPicked];
  return NextResponse.json(result);
}
