import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("team_id");
  const challengeId = searchParams.get("challenge_id");
  if (!teamId || !challengeId) {
    return NextResponse.json({ error: "team_id and challenge_id required" }, { status: 400 });
  }

  // RLS restricts what the caller can see; only members/organizers will get a row back.
  const { data } = await supabase
    .from("instances")
    .select("id, status, host, expires_at, started_at, container_id")
    .eq("team_id", teamId)
    .eq("challenge_id", challengeId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return NextResponse.json({ instance: null });

  return NextResponse.json({
    instance: {
      ...data,
      url: data.host ? `http://${data.host}` : null,
    },
  });
}
