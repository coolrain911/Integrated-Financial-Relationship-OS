import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { dailyBriefingRowToDto, type DailyBriefingRow } from "@/lib/mapping";

// Some days the briefing arrives as a photo (a newspaper clipping
// screenshot) rather than selectable text, so it needs to be attachable as
// an image instead of retyped by hand. Keyed by date, same as the text
// route — either or both may be set for a given day.
const BUCKET = "briefings";
const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function extFor(file: File): string | null {
  if (ALLOWED_TYPES[file.type]) return ALLOWED_TYPES[file.type];
  const fromName = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : null;
  if (fromName && Object.values(ALLOWED_TYPES).includes(fromName)) return fromName;
  return null;
}

async function loadBriefing(date: string) {
  return getSupabaseAdmin().from("daily_briefings").select("*").eq("briefing_date", date).maybeSingle();
}

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ detail: "invalid form data" }, { status: 400 });
  }

  const date = form.get("date");
  if (typeof date !== "string" || !DATE_RE.test(date)) {
    return NextResponse.json({ detail: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ detail: "file is required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ detail: "file must be 15MB or smaller" }, { status: 400 });
  }
  const ext = extFor(file);
  if (!ext) {
    return NextResponse.json({ detail: "only PNG, JPEG, or WEBP images are supported" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: existing } = await loadBriefing(date);
  const existingPath = (existing as DailyBriefingRow | null)?.image_path;
  const path = `${date}.${ext}`;

  if (existingPath && existingPath !== path) {
    await supabaseAdmin.storage.from(BUCKET).remove([existingPath]);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (uploadError) {
    return NextResponse.json({ detail: uploadError.message }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("daily_briefings")
    .upsert(
      { briefing_date: date, image_path: path, updated_at: new Date().toISOString() },
      { onConflict: "briefing_date" }
    )
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json(dailyBriefingRowToDto(data as DailyBriefingRow));
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ detail: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  const { data: row, error: loadError } = await loadBriefing(date);
  if (loadError) {
    return NextResponse.json({ detail: loadError.message }, { status: 500 });
  }
  const imagePath = (row as DailyBriefingRow | null)?.image_path;
  if (!row || !imagePath) {
    return NextResponse.json({ detail: "no image attached" }, { status: 404 });
  }

  const { data: blob, error } = await getSupabaseAdmin().storage.from(BUCKET).download(imagePath);
  if (error || !blob) {
    return NextResponse.json({ detail: error?.message ?? "download failed" }, { status: 500 });
  }

  return new NextResponse(blob, {
    headers: {
      "Content-Type": blob.type || "application/octet-stream",
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}

export async function DELETE(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ detail: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  const { data: existing, error: loadError } = await loadBriefing(date);
  if (loadError) {
    return NextResponse.json({ detail: loadError.message }, { status: 500 });
  }
  const row = existing as DailyBriefingRow | null;
  if (!row || !row.image_path) {
    return NextResponse.json({ detail: "no image attached" }, { status: 404 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  await supabaseAdmin.storage.from(BUCKET).remove([row.image_path]);

  const { data, error } = await supabaseAdmin
    .from("daily_briefings")
    .update({ image_path: null })
    .eq("briefing_date", date)
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json(dailyBriefingRowToDto(data as DailyBriefingRow));
}
