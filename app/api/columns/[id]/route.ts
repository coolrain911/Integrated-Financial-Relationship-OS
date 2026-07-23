import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { columnRowToDto, type ColumnRow } from "@/lib/mapping";
import type { ColumnUpdateBody } from "@/lib/types";

async function loadColumn(id: number) {
  return getSupabaseAdmin().from("columns_lib").select("*").eq("id", id).maybeSingle();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const columnId = Number(id);
  if (!Number.isInteger(columnId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  const { data, error } = await loadColumn(columnId);
  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ detail: "column not found" }, { status: 404 });
  }

  return NextResponse.json(columnRowToDto(data as ColumnRow));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const columnId = Number(id);
  if (!Number.isInteger(columnId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  let body: ColumnUpdateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "invalid JSON body" }, { status: 400 });
  }

  if (Object.prototype.hasOwnProperty.call(body, "title") && (!body.title || !body.title.trim())) {
    return NextResponse.json({ detail: "title cannot be empty" }, { status: 400 });
  }

  const columnMap: Record<string, string> = {
    num: "num",
    title: "title",
    category: "category",
    file: "file",
  };

  const updates: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(columnMap)) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      updates[column] = (body as Record<string, unknown>)[key];
    }
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (Object.keys(updates).length > 0) {
    const { error } = await supabaseAdmin.from("columns_lib").update(updates).eq("id", columnId);
    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }
  }

  const { data, error } = await loadColumn(columnId);
  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ detail: "column not found" }, { status: 404 });
  }

  return NextResponse.json(columnRowToDto(data as ColumnRow));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const columnId = Number(id);
  if (!Number.isInteger(columnId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  const { error, count } = await getSupabaseAdmin()
    .from("columns_lib")
    .delete({ count: "exact" })
    .eq("id", columnId);

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
  if (!count) {
    return NextResponse.json({ detail: "column not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
