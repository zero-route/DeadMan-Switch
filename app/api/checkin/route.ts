export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, describeDbError } from "@/lib/supabase";
import { isValidPin } from "@/lib/auth";

const attempts = new Map<string, { count: number; resetAt: number }>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS    = 60_000;
const BLOCK_MS     = 300_000;

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
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
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
    return NextResponse.json({ error: "PIN salah" }, { status: 401 });
  }

  resetOnSuccess(ip);

  const supabase = getSupabaseAdmin();
  const checkedInAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("switch_state")
    .upsert(
      { id: 1, last_checkin: checkedInAt, triggered: false },
      { onConflict: "id" }
    )
    .select("id");

  if (error) {
    return NextResponse.json({ error: describeDbError(error) }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Check-in tidak tersimpan" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, checked_in_at: checkedInAt });
}
