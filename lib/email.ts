import nodemailer from "nodemailer";

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("Missing GMAIL_USER or GMAIL_APP_PASSWORD env vars");
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

function getRecipients(): string[] {
  const raw = process.env.EMAIL_RECIPIENTS || "";
  const list = raw.split(",").map((e) => e.trim()).filter(Boolean);
  if (list.length === 0) throw new Error("Missing EMAIL_RECIPIENTS env var");
  return list;
}

// Kirim teks notifikasi ke semua penerima
export async function sendEmailText(text: string) {
  const transporter = getTransporter();
  const to = getRecipients();

  await transporter.sendMail({
    from: `"Deadman Switch" <${process.env.GMAIL_USER}>`,
    to: to.join(","),
    subject: "⚠️ Deadman Switch Aktif",
    text,
  });
}

// Kirim file sebagai attachment ke semua penerima
export async function sendEmailDocument(
  fileBuffer: Buffer,
  filename: string,
  caption?: string | null
) {
  const transporter = getTransporter();
  const to = getRecipients();

  await transporter.sendMail({
    from: `"Deadman Switch" <${process.env.GMAIL_USER}>`,
    to: to.join(","),
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
