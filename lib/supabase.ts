import { createClient } from "@supabase/supabase-js";

export const FILES_BUCKET = "deadman-files";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: {
      fetch: (input, options) => {
        return fetch(input, { ...options, cache: "no-store" });
      },
    },
  });
}

export function describeDbError(
  error: { code?: string; message?: string } | null | undefined
): string {
  if (!error) return "Kesalahan database tidak diketahui";
  if (error.code === "PGRST205" || error.code === "42P01") {
    return "Tabel tidak ditemukan. Jalankan schema.sql di SQL Editor Supabase.";
  }
  if (error.code === "PGRST116") {
    return "Baris switch_state (id=1) tidak ada. Jalankan schema.sql di SQL Editor Supabase.";
  }
  return error.message || "Kesalahan database";
}
