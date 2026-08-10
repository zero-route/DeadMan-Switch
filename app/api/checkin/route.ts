export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isValidPin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const pin = body?.pin;

  if (!isValidPin(pin)) {
    return NextResponse.json({ error: "PIN salah" }, { status: 401 });
  }

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
