import { NextRequest, NextResponse } from "next/server";

// Google Translate's unauthenticated "gtx" client endpoint — the same one
// browser extensions and quick scripts use. No API key needed, but it's
// undocumented, so a fetch failure here just surfaces as a translation
// error to the UI rather than crashing anything.
function extractTranslation(data: unknown): string {
  if (!Array.isArray(data) || !Array.isArray(data[0])) return "";
  return (data[0] as unknown[])
    .map((chunk) => (Array.isArray(chunk) && typeof chunk[0] === "string" ? chunk[0] : ""))
    .join("");
}

export async function POST(request: NextRequest) {
  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "invalid JSON body" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ detail: "text is required" }, { status: 400 });
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FINOS-dashboard/1.0)" },
    });
    if (!res.ok) throw new Error("translate request failed");

    const data: unknown = await res.json();
    const translated = extractTranslation(data);
    if (!translated) throw new Error("empty translation");

    return NextResponse.json({ translated });
  } catch {
    return NextResponse.json({ detail: "translation failed" }, { status: 502 });
  }
}
