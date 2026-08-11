import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    // TAMBAHKAN BLOK GLOBAL INI
    global: {
      fetch: (url, options) => {
        return fetch(url, { ...options, cache: "no-store" });
      },
    },
  });
}

export const FILES_BUCKET = "deadman-files";
