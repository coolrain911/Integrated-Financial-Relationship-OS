import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { manualIndexRowToDto, type ManualIndexRow } from "@/lib/mapping";
import type { ManualIndexUpdateBody } from "@/lib/types";

async function loadManualIndex(id: number) {
  return getSupabaseAdmin().from("manual_indexes").select("*").eq("id", id).maybeSingle();
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const indexId = Number(id);
  if (!Number.isInteger(indexId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  let body: ManualIndexUpdateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "invalid JSON body" }, { status: 400 });
  }

  if (
    Object.prototype.hasOwnProperty.call(body, "value") &&
    body.value !== null &&
    (typeof body.value !== "number" || Number.isNaN(body.value))
  ) {
    return NextResponse.json({ detail: "value must be a number or null" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (Object.prototype.hasOwnProperty.call(body, "value")) updates.value = body.value;
  if (Object.prototype.hasOwnProperty.call(body, "note")) updates.note = body.note;

  const supabaseAdmin = getSupabaseAdmin();
  const { error: updateError } = await supabaseAdmin
    .from("manual_indexes")
    .update(updates)
    .eq("id", indexId);
  if (updateError) {
    return NextResponse.json({ detail: updateError.message }, { status: 500 });
  }

  const { data, error } = await loadManualIndex(indexId);
  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ detail: "index not found" }, { status: 404 });
  }

  return NextResponse.json(manualIndexRowToDto(data as ManualIndexRow));
}
