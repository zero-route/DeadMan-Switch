const TELEGRAM_API = "https://api.telegram.org";

function getConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIdsRaw = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatIdsRaw) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID env vars");
  }
  // Support multiple Chat IDs dipisah koma
  const chatIds = chatIdsRaw.split(",").map((id) => id.trim()).filter(Boolean);
  return { token, chatIds };
}

// Kirim teks ke semua Chat ID
export async function sendWhatsAppText(text: string) {
  const { token, chatIds } = getConfig();

  await Promise.allSettled(
    chatIds.map((chatId) =>
      fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      }).then((res) => {
        if (!res.ok) throw new Error(`Telegram API error: ${res.status} (chat_id: ${chatId})`);
        return res.json();
      })
    )
  );
}

// Kirim file ke semua Chat ID
export async function sendWhatsAppDocument(
  fileBuffer: Buffer,
  filename: string,
  caption?: string | null
) {
  const { token, chatIds } = getConfig();

  await Promise.allSettled(
    chatIds.map(async (chatId) => {
      const form = new FormData();
      form.append("chat_id", chatId);
      if (caption) form.append("caption", caption);
      form.append("document", new Blob([new Uint8Array(fileBuffer)]), filename);

      const res = await fetch(`${TELEGRAM_API}/bot${token}/sendDocument`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error(`Telegram API error: ${res.status} (chat_id: ${chatId})`);
      return res.json();
    })
  );
}
