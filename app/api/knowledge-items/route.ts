import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { knowledgeItemRowToDto, type KnowledgeItemRow } from "@/lib/mapping";
import type { KnowledgeItemCreateBody } from "@/lib/types";

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from("knowledge_items")
    .select("*")
    .order("item_date", { ascending: false, nullsFirst: false });

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json((data as KnowledgeItemRow[]).map(knowledgeItemRowToDto));
}

export async function POST(request: NextRequest) {
  let body: KnowledgeItemCreateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "invalid JSON body" }, { status: 400 });
  }

  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ detail: "title is required" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("knowledge_items")
    .insert({
      title: body.title,
      category: body.category ?? null,
      item_date: body.itemDate ?? null,
      content: body.content ?? null,
      link: body.link ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json(knowledgeItemRowToDto(data as KnowledgeItemRow));
}
