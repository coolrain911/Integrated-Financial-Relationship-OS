import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { LicenseCertRow } from "@/lib/mapping";
import { licenseCertRowToDto } from "@/lib/mapping";

const BUCKET = "licenses";
const MAX_BYTES = 15 * 1024 * 1024; // 15MB — comfortably above a typical scan/PDF
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};

function extFor(file: File): string | null {
  if (ALLOWED_TYPES[file.type]) return ALLOWED_TYPES[file.type];
  const fromName = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : null;
  if (fromName && Object.values(ALLOWED_TYPES).includes(fromName)) return fromName;
  return null;
}

async function loadLicenseCert(id: number) {
  return getSupabaseAdmin()
    .from("licenses_certificates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) {
    return NextResponse.json({ detail: "invalid id" }, { status: 400 });
  }

  const { data: existing, error: loadError } = await loadLicenseCert(itemId);
  if (loadError) {
    return NextResponse.json({ detail: loadError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ detail: "license/certificate not found" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ detail: "invalid form data" }, { status: 400 });
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
    return NextResponse.json(
      { detail: "only PDF, PNG, or JPEG files are supported" },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();
  const row = existing as LicenseCertRow;
  const path = `${itemId}.${ext}`;

  // A previous upload at a different extension (e.g. replacing a .png scan
  // with a .pdf) would otherwise be left behind as an orphaned object.
  if (row.file_path && row.file_path !== path) {
    await supabaseAdmin.storage.from(BUCKET).remove([row.file_path]);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (uploadError) {
    return NextResponse.json({ detail: uploadError.message }, { status: 500 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("licenses_certificates")
    .update({ file_path: path, file_name: file.name })
    .eq("id", itemId)
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json(licenseCertRowToDto(data as LicenseCertRow));
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

  const { data: row, error: loadError } = await loadLicenseCert(itemId);
  if (loadError) {
    return NextResponse.json({ detail: loadError.message }, { status: 500 });
  }
  const filePath = (row as LicenseCertRow | null)?.file_path;
  if (!row || !filePath) {
    return NextResponse.json({ detail: "no file attached" }, { status: 404 });
  }

  const { data: blob, error } = await getSupabaseAdmin().storage.from(BUCKET).download(filePath);
  if (error || !blob) {
    return NextResponse.json({ detail: error?.message ?? "download failed" }, { status: 500 });
  }

  const fileName = (row as LicenseCertRow).file_name || filePath;
  return new NextResponse(blob, {
    headers: {
      "Content-Type": blob.type || "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
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

  const { data: existing, error: loadError } = await loadLicenseCert(itemId);
  if (loadError) {
    return NextResponse.json({ detail: loadError.message }, { status: 500 });
  }
  const row = existing as LicenseCertRow | null;
  if (!row || !row.file_path) {
    return NextResponse.json({ detail: "no file attached" }, { status: 404 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  await supabaseAdmin.storage.from(BUCKET).remove([row.file_path]);

  const { data, error } = await supabaseAdmin
    .from("licenses_certificates")
    .update({ file_path: null, file_name: null })
    .eq("id", itemId)
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json(licenseCertRowToDto(data as LicenseCertRow));
}
