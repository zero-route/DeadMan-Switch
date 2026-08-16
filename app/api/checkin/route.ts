 export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isValidPin } from "@/lib/auth";

// ── In-memory rate limiter ──
// Key: IP address, Value: { count, resetAt }
const attempts = new Map<string, { count: number; resetAt: number }>();

const MAX_ATTEMPTS = 5;      // maksimal 5 percobaan
const WINDOW_MS    = 60_000; // per 1 menit
const BLOCK_MS     = 300_000; // blokir 5 menit setelah melebihi limit

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now > record.resetAt) {
    // Window baru atau sudah expired
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    // Sudah melebihi limit — blokir dan perpanjang window
    record.resetAt = now + BLOCK_MS;
    return { allowed: false, retryAfter: Math.ceil(BLOCK_MS / 1000) };
  }

  record.count += 1;
  return { allowed: true };
}

function resetOnSuccess(ip: string) {
  attempts.delete(ip);
}

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  const { allowed, retryAfter } = checkRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil((retryAfter ?? BLOCK_MS) / 60)} menit.` },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter ?? 300) },
      }
    );
  }

  const body = await req.json().catch(() => ({}));
  const pin  = body?.pin;

  if (!isValidPin(pin)) {
    // PIN salah tetap dihitung sebagai attempt
    return NextResponse.json({ error: "PIN salah" }, { status: 401 });
  }

  // PIN benar — reset counter
  resetOnSuccess(ip);

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("switch_state")
    .update({
      last_checkin: new Date().toISOString(),
      triggered: false,
    })
    .eq("id", 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, checked_in_at: new Date().toISOString() });
}
