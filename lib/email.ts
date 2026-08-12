import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY env var");
  return new Resend(apiKey);
}

function getRecipients(): string[] {
  const raw = process.env.EMAIL_RECIPIENTS || "";
  const list = raw.split(",").map((e) => e.trim()).filter(Boolean);
  if (list.length === 0) throw new Error("Missing EMAIL_RECIPIENTS env var");
  return list;
}

function getFrom(): string {
  return process.env.EMAIL_FROM || "Deadman Switch <onboarding@resend.dev>";
}

// Kirim teks notifikasi ke semua penerima
export async function sendEmailText(text: string) {
  const resend = getResend();
  const to = getRecipients();

  await resend.emails.send({
    from: getFrom(),
    to,
    subject: "⚠️ Deadman Switch Aktif",
    text,
  });
}

// Kirim satu file sebagai attachment ke semua penerima
export async function sendEmailDocument(
  fileBuffer: Buffer,
  filename: string,
  caption?: string | null
) {
  const resend = getResend();
  const to = getRecipients();

  await resend.emails.send({
    from: getFrom(),
    to,
    subject: `⚠️ Deadman Switch — ${filename}`,
    text: caption || `File terlampir: ${filename}`,
    attachments: [
      {
        filename,
        content: fileBuffer,
      },
    ],
  });
}
