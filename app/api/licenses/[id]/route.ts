import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { licenseCertRowToDto, type LicenseCertRow } from "@/lib/mapping";
import type { LicenseCertUpdateBody } from "@/lib/types";

async function loadLicenseCert(id: number) {
  return getSupabaseAdmin().from("licenses_certificates").select("*").eq("id", id).maybeSingle();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  const { data, error } = await loadLicenseCert(itemId);
  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ detail: "license/certificate not found" }, { status: 404 });
  }

  return NextResponse.json(licenseCertRowToDto(data as LicenseCertRow));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  let body: LicenseCertUpdateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "invalid JSON body" }, { status: 400 });
  }

  if (Object.prototype.hasOwnProperty.call(body, "title") && (!body.title || !body.title.trim())) {
    return NextResponse.json({ detail: "title cannot be empty" }, { status: 400 });
  }
  if (Object.prototype.hasOwnProperty.call(body, "category") && !body.category) {
    return NextResponse.json({ detail: "category cannot be empty" }, { status: 400 });
  }

  const fieldMap: Record<string, string> = {
    title: "title",
    category: "category",
    issuer: "issuer",
    issueDate: "issue_date",
    expiryDate: "expiry_date",
    referenceNo: "reference_no",
    link: "link",
    note: "note",
  };

  const updates: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(fieldMap)) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      updates[column] = (body as Record<string, unknown>)[key];
    }
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (Object.keys(updates).length > 0) {
    const { error } = await supabaseAdmin
      .from("licenses_certificates")
      .update(updates)
      .eq("id", itemId);
    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }
  }

  const { data, error } = await loadLicenseCert(itemId);
  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ detail: "license/certificate not found" }, { status: 404 });
  }

  return NextResponse.json(licenseCertRowToDto(data as LicenseCertRow));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  const { error, count } = await getSupabaseAdmin()
    .from("licenses_certificates")
    .delete({ count: "exact" })
    .eq("id", itemId);

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  if (!count) {
    return NextResponse.json({ detail: "license/certificate not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
