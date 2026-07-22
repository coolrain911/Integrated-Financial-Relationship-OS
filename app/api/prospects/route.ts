import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { compareByLastName, prospectRowToDto, type ProspectRow } from "@/lib/mapping";

export async function GET() {
  const { data, error } = await getSupabaseAdmin().from("prospects").select("*");

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  const dtos = (data as ProspectRow[]).map(prospectRowToDto);
  dtos.sort(compareByLastName);
  return NextResponse.json(dtos);
}
