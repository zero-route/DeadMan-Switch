export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, describeDbError } from "@/lib/supabase";

const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" };

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("switch_state")
    .select("last_checkin, threshold_hours, triggered")
    .eq("id", 1)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: describeDbError(error) },
      { status: 500, headers: NO_CACHE }
    );
  }

  const lastCheckin = new Date(data.last_checkin);
  const deadline = new Date(
    lastCheckin.getTime() + data.threshold_hours * 60 * 60 * 1000
  );

  return NextResponse.json(
    {
      last_checkin: data.last_checkin,
      threshold_hours: data.threshold_hours,
      triggered: data.triggered,
      deadline: deadline.toISOString(),
    },
    { headers: NO_CACHE }
  );
}
