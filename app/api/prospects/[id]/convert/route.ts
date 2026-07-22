import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { clientRowToDto, type ClientRow } from "@/lib/clientMapping";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const prospectId = Number(id);
  if (!Number.isInteger(prospectId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  // convert_prospect() runs the insert-into-clients + delete-from-prospects
  // as a single Postgres transaction (see supabase/schema.sql), so a prospect
  // can never be dropped without the corresponding client existing, or vice
  // versa.
  const { data, error } = await getSupabaseAdmin().rpc("convert_prospect", {
    p_id: prospectId,
  });

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ detail: "prospect not found" }, { status: 404 });
  }

  return NextResponse.json(clientRowToDto(data as ClientRow, new Date()));
}
