import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { compareByLastName, prospectRowToDto, type ProspectRow } from "@/lib/mapping";
import type { ProspectCreateBody } from "@/lib/types";

export async function GET() {
  const { data, error } = await getSupabaseAdmin().from("prospects").select("*");

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  const dtos = (data as ProspectRow[]).map(prospectRowToDto);
  dtos.sort(compareByLastName);
  return NextResponse.json(dtos);
}

export async function POST(request: NextRequest) {
  let body: ProspectCreateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "invalid JSON body" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("prospects")
    .insert({
      last_name: body.lastName ?? null,
      first_name: body.firstName ?? null,
      korean_name: body.koreanName ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      category: body.category ?? null,
      note: body.note ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json(prospectRowToDto(data as ProspectRow));
}
