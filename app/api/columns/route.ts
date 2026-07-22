import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { columnRowToDto, type ColumnRow } from "@/lib/clientMapping";

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("columns_lib")
    .select("*")
    .order("num");

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json((data as ColumnRow[]).map(columnRowToDto));
}
