import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { licenseCertRowToDto, type LicenseCertRow } from "@/lib/mapping";
import type { LicenseCertCreateBody } from "@/lib/types";

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("licenses_certificates")
    .select("*")
    .order("expiry_date", { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json((data as LicenseCertRow[]).map(licenseCertRowToDto));
}

export async function POST(request: NextRequest) {
  let body: LicenseCertCreateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "invalid JSON body" }, { status: 400 });
  }

  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ detail: "title is required" }, { status: 400 });
  }
  if (!body.category) {
    return NextResponse.json({ detail: "category is required" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("licenses_certificates")
    .insert({
      title: body.title,
      category: body.category,
      issuer: body.issuer ?? null,
      issue_date: body.issueDate ?? null,
      expiry_date: body.expiryDate ?? null,
      reference_no: body.referenceNo ?? null,
      link: body.link ?? null,
      note: body.note ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json(licenseCertRowToDto(data as LicenseCertRow));
}
