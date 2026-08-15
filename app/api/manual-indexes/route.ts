import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { manualIndexRowToDto, type ManualIndexRow } from "@/lib/mapping";

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("manual_indexes")
    .select("*")
    .order("id");

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json((data as ManualIndexRow[]).map(manualIndexRowToDto));
}
