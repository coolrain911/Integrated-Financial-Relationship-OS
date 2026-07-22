import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { prospectRowToDto, type ProspectRow } from "@/lib/mapping";
import type { ProspectUpdateBody } from "@/lib/types";

async function loadProspect(id: number) {
  return getSupabaseAdmin().from("prospects").select("*").eq("id", id).maybeSingle();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const prospectId = Number(id);
  if (!Number.isInteger(prospectId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  const { data, error } = await loadProspect(prospectId);
  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ detail: "prospect not found" }, { status: 404 });
  }

  return NextResponse.json(prospectRowToDto(data as ProspectRow));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const prospectId = Number(id);
  if (!Number.isInteger(prospectId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  let body: ProspectUpdateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "invalid JSON body" }, { status: 400 });
  }

  const columnMap: Record<string, string> = {
    lastName: "last_name",
    firstName: "first_name",
    koreanName: "korean_name",
    email: "email",
    phone: "phone",
    category: "category",
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
    const { error } = await supabaseAdmin.from("prospects").update(updates).eq("id", prospectId);
    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }
  }

  const { data, error } = await loadProspect(prospectId);
  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ detail: "prospect not found" }, { status: 404 });
  }

  return NextResponse.json(prospectRowToDto(data as ProspectRow));
}
