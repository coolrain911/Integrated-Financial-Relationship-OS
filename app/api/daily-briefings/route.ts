import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { dailyBriefingRowToDto, type DailyBriefingRow } from "@/lib/mapping";
import { parseBriefingText } from "@/lib/briefing";
import type { DailyBriefingSaveBody } from "@/lib/types";

// Returns only the single most recent day's briefing — the dashboard shows
// just "today's" (or, if none pasted yet, the last one pasted) briefing, not
// a history list.
export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("daily_briefings")
    .select("*")
    .order("briefing_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json(data ? dailyBriefingRowToDto(data as DailyBriefingRow) : null);
}

export async function POST(request: NextRequest) {
  let body: DailyBriefingSaveBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "invalid JSON body" }, { status: 400 });
  }

  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json({ detail: "date must be YYYY-MM-DD" }, { status: 400 });
  }
  if (!body.rawText || !body.rawText.trim()) {
    return NextResponse.json({ detail: "rawText is required" }, { status: 400 });
  }

  const items = parseBriefingText(body.rawText);

  const { data, error } = await getSupabaseAdmin()
    .from("daily_briefings")
    .upsert(
      {
        briefing_date: body.date,
        raw_text: body.rawText,
        items,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "briefing_date" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json(dailyBriefingRowToDto(data as DailyBriefingRow));
}
