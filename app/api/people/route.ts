import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { personRowToDto, type PersonRow } from "@/lib/mapping";
import type { PersonCreateBody } from "@/lib/types";

const GENDER_VALUES = ["남", "여"];

export async function POST(request: NextRequest) {
  let body: PersonCreateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "invalid JSON body" }, { status: 400 });
  }

  if (!body.lastName || !body.lastName.trim()) {
    return NextResponse.json({ detail: "lastName is required" }, { status: 400 });
  }
  if (body.gender !== null && body.gender !== undefined && !GENDER_VALUES.includes(body.gender)) {
    return NextResponse.json(
      { detail: `gender must be one of: ${GENDER_VALUES.join(", ")}` },
      { status: 400 }
    );
  }

  const { data, error } = await getSupabaseAdmin()
    .from("people")
    .insert({
      last_name: body.lastName,
      first_name: body.firstName ?? null,
      gender: body.gender ?? null,
      dob: body.dob ?? null,
      occupation: body.occupation ?? null,
      medicare: body.medicare ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      note: body.note ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json(personRowToDto(data as PersonRow, new Date()));
}
