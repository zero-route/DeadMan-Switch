export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, FILES_BUCKET } from "@/lib/supabase";
import { sendWhatsAppDocument, sendWhatsAppText } from "@/lib/telegram";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const { data: state, error: stateError } = await supabase
    .from("switch_state")
    .select("last_checkin, threshold_hours, triggered")
    .eq("id", 1)
    .single();

  if (stateError || !state) {
    return NextResponse.json({ error: stateError?.message || "no state" }, { status: 500 });
  }

  if (state.triggered) {
    return NextResponse.json({ status: "already_triggered" });
  }

  const deadline = new Date(state.last_checkin).getTime() + state.threshold_hours * 60 * 60 * 1000;
  const now = Date.now();

  if (now < deadline) {
    return NextResponse.json({ status: "ok", deadline: new Date(deadline).toISOString() });
  }

  const { data: files, error: filesError } = await supabase
    .from("switch_files")
    .select("storage_path, filename, mime_type, caption");

  if (filesError) {
    return NextResponse.json({ error: filesError.message }, { status: 500 });
  }

  if (!files || files.length === 0) {
    await sendWhatsAppText(
      "⚠️ Deadman switch aktif: check-in terlewat, tapi tidak ada file yang terdaftar untuk dikirim."
    );
  } else {
    await sendWhatsAppText(
      `⚠️ Deadman switch aktif. Check-in terlewat sejak ${new Date(deadline).toLocaleString("id-ID")}. Mengirim ${files.length} file berikut ini...`
    );

    for (const file of files) {
      const { data: fileBytes, error: downloadError } = await supabase.storage
        .from(FILES_BUCKET)
        .download(file.storage_path);

      if (downloadError || !fileBytes) {
        await sendWhatsAppText(`Gagal mengambil file: ${file.filename}`);
        continue;
      }
      
const buffer = Buffer.from(await fileBytes.arrayBuffer());
      await sendWhatsAppDocument(buffer, file.filename, file.caption);
    }
  }

  await supabase.from("switch_state").update({ triggered: true }).eq("id", 1);

  return NextResponse.json({ status: "triggered", files_sent: files?.length || 0 });
}
