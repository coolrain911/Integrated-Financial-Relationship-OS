import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  personRowToDto,
  policyRowToDto,
  type PersonRow,
  type PolicyWithNameRow,
} from "@/lib/mapping";
import type { PersonUpdateBody } from "@/lib/types";

const GENDER_VALUES = ["남", "여"];

async function loadPersonWithPolicies(id: number) {
  const supabaseAdmin = getSupabaseAdmin();
  const [personRes, policiesRes] = await Promise.all([
    supabaseAdmin.from("people").select("*").eq("id", id).maybeSingle(),
    supabaseAdmin
      .from("policies")
      .select("*, people(last_name, first_name)")
      .eq("person_id", id),
  ]);
  return { personRes, policiesRes };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const personId = Number(id);
  if (!Number.isInteger(personId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  const { personRes, policiesRes } = await loadPersonWithPolicies(personId);
  if (personRes.error) {
    return NextResponse.json({ detail: personRes.error.message }, { status: 500 });
  }
  if (!personRes.data) {
    return NextResponse.json({ detail: "person not found" }, { status: 404 });
  }
  if (policiesRes.error) {
    return NextResponse.json({ detail: policiesRes.error.message }, { status: 500 });
  }

  const today = new Date();
  return NextResponse.json({
    person: personRowToDto(personRes.data as PersonRow, today),
    policies: (policiesRes.data as unknown as PolicyWithNameRow[]).map((row) =>
      policyRowToDto(row, today)
    ),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const personId = Number(id);
  if (!Number.isInteger(personId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  let body: PersonUpdateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "invalid JSON body" }, { status: 400 });
  }

  if (body.gender !== null && body.gender !== undefined && !GENDER_VALUES.includes(body.gender)) {
    return NextResponse.json(
      { detail: `gender must be one of: ${GENDER_VALUES.join(", ")}` },
      { status: 400 }
    );
  }
  if (
    Object.prototype.hasOwnProperty.call(body, "lastName") &&
    (!body.lastName || !body.lastName.trim())
  ) {
    return NextResponse.json({ detail: "lastName cannot be empty" }, { status: 400 });
  }

  const columnMap: Record<string, string> = {
    lastName: "last_name",
    firstName: "first_name",
    gender: "gender",
    dob: "dob",
    occupation: "occupation",
    medicare: "medicare",
    email: "email",
    phone: "phone",
    note: "note",
  };

  const updates: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(columnMap)) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      updates[column] = (body as Record<string, unknown>)[key];
    }
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (Object.keys(updates).length > 0) {
    const { error } = await supabaseAdmin.from("people").update(updates).eq("id", personId);
    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }
  }

  const { personRes, policiesRes } = await loadPersonWithPolicies(personId);
  if (personRes.error) {
    return NextResponse.json({ detail: personRes.error.message }, { status: 500 });
  }
  if (!personRes.data) {
    return NextResponse.json({ detail: "person not found" }, { status: 404 });
  }
  if (policiesRes.error) {
    return NextResponse.json({ detail: policiesRes.error.message }, { status: 500 });
  }

  const today = new Date();
  return NextResponse.json({
    person: personRowToDto(personRes.data as PersonRow, today),
    policies: (policiesRes.data as unknown as PolicyWithNameRow[]).map((row) =>
      policyRowToDto(row, today)
    ),
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const personId = Number(id);
  if (!Number.isInteger(personId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  // policies.person_id has ON DELETE CASCADE, so this also removes all of
  // this person's policies.
  const { error, count } = await getSupabaseAdmin()
    .from("people")
    .delete({ count: "exact" })
    .eq("id", personId);

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  if (!count) {
    return NextResponse.json({ detail: "person not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
