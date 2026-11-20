export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabaseAdmin, describeDbError, FILES_BUCKET } from "@/lib/supabase";
import { isValidPin } from "@/lib/auth";

function safeStoragePath(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot > -1 ? name.slice(dot).replace(/[^a-zA-Z0-9.]/g, "").slice(0, 12) : "";
  return `${Date.now()}-${randomUUID()}${ext}`;
}

export async function GET(req: NextRequest) {
  const pin = req.headers.get("x-pin");
  if (!isValidPin(pin)) {
    return NextResponse.json({ error: "PIN salah" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("switch_files")
    .select("id, storage_path, filename, mime_type, caption, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: describeDbError(error) }, { status: 500 });
  return NextResponse.json({ files: data });
}

export async function POST(req: NextRequest) {
  const form    = await req.formData();
  const pin     = form.get("pin") as string | null;
  const caption = (form.get("caption") as string | null) || null;
  const file    = form.get("file") as File | null;

  if (!isValidPin(pin)) {
    return NextResponse.json({ error: "PIN salah" }, { status: 401 });
  }
  if (!file) {
    return NextResponse.json({ error: "Tidak ada file" }, { status: 400 });
  }

  const supabase    = getSupabaseAdmin();
  const storagePath = safeStoragePath(file.name);
  const bytes       = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(FILES_BUCKET)
    .upload(storagePath, bytes, { contentType: file.type || "application/octet-stream" });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { error: dbError } = await supabase.from("switch_files").insert({
    storage_path: storagePath,
    filename:     file.name,
    mime_type:    file.type,
    caption,
  });

  if (dbError) {
    await supabase.storage.from(FILES_BUCKET).remove([storagePath]);
    return NextResponse.json({ error: describeDbError(dbError) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { pin, id } = await req.json();
  if (!isValidPin(pin)) {
    return NextResponse.json({ error: "PIN salah" }, { status: 401 });
  }
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: row, error: findError } = await supabase
    .from("switch_files")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (findError || !row) {
    return NextResponse.json({ error: describeDbError(findError) }, { status: 404 });
  }

  const { error: removeError } = await supabase.storage
    .from(FILES_BUCKET)
    .remove([row.storage_path]);

  if (removeError) {
    return NextResponse.json({ error: removeError.message }, { status: 500 });
  }

  const { error } = await supabase.from("switch_files").delete().eq("id", id);

  if (error) return NextResponse.json({ error: describeDbError(error) }, { status: 500 });
  return NextResponse.json({ ok: true });
}
