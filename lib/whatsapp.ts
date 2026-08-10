const GRAPH_VERSION = "v20.0";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export async function uploadMediaToWhatsApp(
  fileBytes: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const phoneNumberId = env("WHATSAPP_PHONE_NUMBER_ID");
  const token = env("WHATSAPP_ACCESS_TOKEN");

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", new Blob([new Uint8Array(fileBytes)], { type: mimeType }), filename);

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/media`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`WhatsApp media upload failed: ${JSON.stringify(data)}`);
  }
  return data.id as string;
}

export async function sendWhatsAppText(message: string): Promise<void> {
  const phoneNumberId = env("WHATSAPP_PHONE_NUMBER_ID");
  const token = env("WHATSAPP_ACCESS_TOKEN");
  const to = env("EMERGENCY_CONTACT_NUMBER");

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`WhatsApp text send failed: ${JSON.stringify(data)}`);
  }
}

export async function sendWhatsAppDocument(
  mediaId: string,
  filename: string,
  caption?: string
): Promise<void> {
  const phoneNumberId = env("WHATSAPP_PHONE_NUMBER_ID");
  const token = env("WHATSAPP_ACCESS_TOKEN");
  const to = env("EMERGENCY_CONTACT_NUMBER");

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "document",
        document: {
          id: mediaId,
          filename,
          caption: caption || undefined,
        },
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`WhatsApp document send failed: ${JSON.stringify(data)}`);
  }
}
