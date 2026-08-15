import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, FILES_BUCKET } from "@/lib/supabase";
import { isValidPin } from "@/lib/auth";

// GET: list semua file (tetap di Vercel)
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ files: data });
}

// POST: upload ditangani oleh Cloudflare Worker
// Fallback ke Vercel jika NEXT_PUBLIC_UPLOAD_WORKER_URL tidak diset
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
  const storagePath = `${Date.now()}-${file.name}`;
  const bytes       = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(FILES_BUCKET)
    .upload(storagePath, bytes, { contentType: file.type });

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
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE: hapus file (tetap di Vercel)
export async function DELETE(req: NextRequest) {
  const { pin, id, storage_path } = await req.json();
  if (!isValidPin(pin)) {
    return NextResponse.json({ error: "PIN salah" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  await supabase.storage.from(FILES_BUCKET).remove([storage_path]);
  const { error } = await supabase.from("switch_files").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
