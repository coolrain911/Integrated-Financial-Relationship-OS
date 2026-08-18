import type { BriefingItemDTO } from "./types";

const NUMBERED_LINE = /^\s*\d{1,2}\.\s*(.+?)\s*$/;
const TRAILING_SOURCE = /^(.*)\(([^()]+)\)\s*$/;

/** Parses a pasted KakaoTalk briefing (a numbered list, each line optionally
 * ending in "(source)") into structured items. Only lines that actually
 * start with "N. " are treated as list items — greeting/title lines above
 * the list, and anything else, are ignored. If nothing matches that shape
 * (a differently-formatted paste), the whole text is kept as a single
 * sourceless item rather than silently dropping it. */
export function parseBriefingText(raw: string): BriefingItemDTO[] {
  const lines = raw.split(/\r?\n/);
  const items: BriefingItemDTO[] = [];

  for (const line of lines) {
    const m = line.match(NUMBERED_LINE);
    if (!m) continue;
    const content = m[1];
    const sourceMatch = content.match(TRAILING_SOURCE);
    if (sourceMatch) {
      items.push({ text: sourceMatch[1].trim(), source: sourceMatch[2].trim() });
    } else {
      items.push({ text: content, source: null });
    }
  }

  if (items.length > 0) return items;

  const fallback = raw.trim();
  return fallback ? [{ text: fallback, source: null }] : [];
}
