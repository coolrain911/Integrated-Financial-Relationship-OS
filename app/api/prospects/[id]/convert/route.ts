import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { personRowToDto, type PersonRow } from "@/lib/mapping";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const prospectId = Number(id);
  if (!Number.isInteger(prospectId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  // convert_prospect() runs the insert-into-people + delete-from-prospects
  // as a single Postgres transaction (see supabase/schema.sql), so a prospect
  // can never be dropped without the corresponding person existing, or vice
  // versa. The new person starts with zero policies.
  const { data, error } = await getSupabaseAdmin().rpc("convert_prospect", {
    p_id: prospectId,
  });

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ detail: "prospect not found" }, { status: 404 });
  }

  return NextResponse.json(personRowToDto(data as PersonRow, new Date()));
}
