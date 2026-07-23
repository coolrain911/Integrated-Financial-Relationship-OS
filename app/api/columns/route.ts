import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { columnRowToDto, type ColumnRow } from "@/lib/mapping";
import type { ColumnCreateBody } from "@/lib/types";

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

export async function POST(request: NextRequest) {
  let body: ColumnCreateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "invalid JSON body" }, { status: 400 });
  }

  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ detail: "title is required" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("columns_lib")
    .insert({
      num: body.num ?? null,
      title: body.title,
      category: body.category ?? null,
      file: body.file ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json(columnRowToDto(data as ColumnRow));
}
