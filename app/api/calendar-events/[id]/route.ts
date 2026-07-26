import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { calendarEventRowToDto, type CalendarEventRow } from "@/lib/mapping";
import type { CalendarEventUpdateBody } from "@/lib/types";

async function loadEvent(id: number) {
  return getSupabaseAdmin().from("calendar_events").select("*").eq("id", id).maybeSingle();
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  let body: CalendarEventUpdateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "invalid JSON body" }, { status: 400 });
  }

  if (Object.prototype.hasOwnProperty.call(body, "title") && (!body.title || !body.title.trim())) {
    return NextResponse.json({ detail: "title cannot be empty" }, { status: 400 });
  }

  const columnMap: Record<string, string> = {
    date: "event_date",
    title: "title",
    note: "note",
  };

  const updates: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(columnMap)) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      updates[column] = (body as Record<string, unknown>)[key];
    }
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (Object.keys(updates).length > 0) {
    const { error } = await supabaseAdmin.from("calendar_events").update(updates).eq("id", eventId);
    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }
  }

  const { data, error } = await loadEvent(eventId);
  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ detail: "event not found" }, { status: 404 });
  }

  return NextResponse.json(calendarEventRowToDto(data as CalendarEventRow));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  const { error, count } = await getSupabaseAdmin()
    .from("calendar_events")
    .delete({ count: "exact" })
    .eq("id", eventId);

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  if (!count) {
    return NextResponse.json({ detail: "event not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
