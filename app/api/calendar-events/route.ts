import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { calendarEventRowToDto, type CalendarEventRow } from "@/lib/mapping";
import type { CalendarEventCreateBody } from "@/lib/types";

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("calendar_events")
    .select("*")
    .order("event_date");

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json((data as CalendarEventRow[]).map(calendarEventRowToDto));
}

export async function POST(request: NextRequest) {
  let body: CalendarEventCreateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "invalid JSON body" }, { status: 400 });
  }

  if (!body.date) {
    return NextResponse.json({ detail: "date is required" }, { status: 400 });
  }
  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ detail: "title is required" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("calendar_events")
    .insert({
      event_date: body.date,
      title: body.title,
      note: body.note ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json(calendarEventRowToDto(data as CalendarEventRow));
}
