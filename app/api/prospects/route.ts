import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { prospectRowToDto, type ProspectRow } from "@/lib/clientMapping";

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("prospects")
    .select("*")
    .order("segment")
    .order("name");

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json((data as ProspectRow[]).map(prospectRowToDto));
}
