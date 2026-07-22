import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { clientRowToDto, compareByLastName, type ClientRow } from "@/lib/clientMapping";

export async function GET() {
  const { data, error } = await getSupabaseAdmin().from("clients").select("*");
  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  const today = new Date();
  const dtos = (data as ClientRow[]).map((row) => clientRowToDto(row, today));
  dtos.sort(compareByLastName);
  return NextResponse.json(dtos);
}
