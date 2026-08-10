export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("switch_state")
    .select("last_checkin, threshold_hours, triggered")
    .eq("id", 1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const lastCheckin = new Date(data.last_checkin);
  const deadline = new Date(
    lastCheckin.getTime() + data.threshold_hours * 60 * 60 * 1000
  );

  return NextResponse.json({
    last_checkin: data.last_checkin,
    threshold_hours: data.threshold_hours,
    triggered: data.triggered,
    deadline: deadline.toISOString(),
  });
}
