export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, describeDbError, FILES_BUCKET } from "@/lib/supabase";
import { sendWhatsAppDocument, sendWhatsAppText } from "@/lib/telegram";
import { sendEmailDocument, sendEmailText } from "@/lib/email";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

async function tryTelegramText(text: string): Promise<boolean> {
  try {
    await sendWhatsAppText(text);
    return true;
  } catch (e) {
    console.error("telegram text failed:", e);
    return false;
  }
}

async function tryEmailText(text: string): Promise<boolean> {
  try {
    await sendEmailText(text);
    return true;
  } catch (e) {
    console.error("email text failed:", e);
    return false;
  }
}

async function alertAll(text: string) {
  await Promise.all([tryTelegramText(text), tryEmailText(text)]);
}

async function broadcastDocument(
  buffer: Buffer,
  filename: string,
  caption?: string | null
): Promise<boolean> {
  const results = await Promise.allSettled([
    sendWhatsAppDocument(buffer, filename, caption),
    sendEmailDocument(buffer, filename, caption),
  ]);
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`broadcastDocument channel ${i} failed:`, r.reason);
    }
  });
  return results.some((r) => r.status === "fulfilled");
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
    const reason = describeDbError(stateError);
    await alertAll(`🚨 Deadman switch TIDAK BISA dicek: ${reason}`);
    return NextResponse.json({ error: reason }, { status: 500 });
  }

  if (state.triggered) {
    return NextResponse.json({ status: "already_triggered" });
  }

  const deadline = new Date(state.last_checkin).getTime() + state.threshold_hours * 60 * 60 * 1000;

  if (Date.now() < deadline) {
    return NextResponse.json({ status: "ok", deadline: new Date(deadline).toISOString() });
  }

  const { data: claimed, error: claimError } = await supabase
    .from("switch_state")
    .update({ triggered: true })
    .eq("id", 1)
    .eq("triggered", false)
    .select("id");

  if (claimError) {
    return NextResponse.json({ error: describeDbError(claimError) }, { status: 500 });
  }
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ status: "already_triggered" });
  }

  const release = async () => {
    await supabase.from("switch_state").update({ triggered: false }).eq("id", 1);
  };

  const { data: files, error: filesError } = await supabase
    .from("switch_files")
    .select("storage_path, filename, mime_type, caption");

  if (filesError) {
    await release();
    const reason = describeDbError(filesError);
    await alertAll(`🚨 Deadman switch gagal membaca daftar file: ${reason}`);
    return NextResponse.json({ error: reason }, { status: 500 });
  }

  if (!files || files.length === 0) {
    const msg =
      "⚠️ Deadman switch aktif: check-in terlewat, tapi tidak ada file yang terdaftar untuk dikirim.";
    const [tg, mail] = await Promise.all([tryTelegramText(msg), tryEmailText(msg)]);
    if (!tg && !mail) {
      await release();
      return NextResponse.json({ error: "semua kanal notifikasi gagal" }, { status: 502 });
    }
    return NextResponse.json({ status: "triggered", files_sent: 0 });
  }

  await tryTelegramText(
    `⚠️ Deadman switch aktif. Check-in terlewat sejak ${new Date(deadline).toLocaleString("id-ID")}. Mengirim ${files.length} file berikut ini...`
  );

  let delivered = 0;
  const failedNames: string[] = [];

  for (const file of files) {
    const { data: fileBytes, error: downloadError } = await supabase.storage
      .from(FILES_BUCKET)
      .download(file.storage_path);

    if (downloadError || !fileBytes) {
      failedNames.push(file.filename);
      continue;
    }

    const buffer = Buffer.from(await fileBytes.arrayBuffer());
    const ok = await broadcastDocument(buffer, file.filename, file.caption);
    if (ok) delivered += 1;
    else failedNames.push(file.filename);
  }

  if (failedNames.length > 0) {
    await tryTelegramText(`Gagal mengirim file: ${failedNames.join(", ")}`);
  }

  if (delivered === 0) {
    await release();
    return NextResponse.json({ error: "tidak ada file yang berhasil terkirim" }, { status: 502 });
  }

  return NextResponse.json({
    status: "triggered",
    files_sent: delivered,
    files_failed: failedNames.length,
  });
}
