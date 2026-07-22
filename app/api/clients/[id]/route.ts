import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { clientRowToDto, type ClientRow } from "@/lib/clientMapping";
import type { ClientUpdateBody } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isInteger(clientId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  let body: ClientUpdateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.reviewed === "boolean") {
    updates.reviewed = body.reviewed;
  }
  if (typeof body.note === "string") {
    updates.note = body.note;
  }
  if (Object.prototype.hasOwnProperty.call(body, "birthdayMonth")) {
    const m = body.birthdayMonth ?? null;
    if (m !== null && !(Number.isInteger(m) && m >= 1 && m <= 12)) {
      return NextResponse.json(
        { detail: "birthdayMonth must be between 1 and 12" },
        { status: 400 }
      );
    }
    updates.birthday_month = m;
  }
  if (Object.prototype.hasOwnProperty.call(body, "birthdayDay")) {
    const d = body.birthdayDay ?? null;
    if (d !== null && !(Number.isInteger(d) && d >= 1 && d <= 31)) {
      return NextResponse.json(
        { detail: "birthdayDay must be between 1 and 31" },
        { status: 400 }
      );
    }
    updates.birthday_day = d;
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (Object.keys(updates).length > 0) {
    const { error } = await supabaseAdmin
      .from("clients")
      .update(updates)
      .eq("id", clientId);
    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ detail: "client not found" }, { status: 404 });
  }

  return NextResponse.json(clientRowToDto(data as ClientRow, new Date()));
}
