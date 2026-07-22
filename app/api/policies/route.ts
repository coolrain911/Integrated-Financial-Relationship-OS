import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { compareByLastName, policyRowToDto, type PolicyWithNameRow } from "@/lib/mapping";

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("policies")
    .select("*, people(last_name, first_name)");

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  const today = new Date();
  const dtos = (data as unknown as PolicyWithNameRow[]).map((row) => policyRowToDto(row, today));
  dtos.sort(compareByLastName);
  return NextResponse.json(dtos);
}
