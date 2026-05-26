import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { startInstance } from "@/lib/instances";

const Body = z.object({
  team_id: z.string().uuid(),
  challenge_id: z.string().uuid(),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Verify caller is in the team and the challenge is in the team's event.
  const { data: tm } = await supabase
    .from("team_members")
    .select("teams!inner(id, event_id)")
    .eq("user_id", user.id)
    .eq("team_id", body.team_id)
    .maybeSingle();
  if (!tm) return NextResponse.json({ error: "not on this team" }, { status: 403 });
  const eventId = (tm.teams as unknown as { event_id: string }).event_id;

  const { data: ec } = await supabase
    .from("event_challenges")
    .select("id")
    .eq("event_id", eventId)
    .eq("challenge_id", body.challenge_id)
    .maybeSingle();
  if (!ec) return NextResponse.json({ error: "challenge not in event" }, { status: 403 });

  try {
    const { instance, url } = await startInstance({
      eventId,
      teamId: body.team_id,
      challengeId: body.challenge_id,
    });
    return NextResponse.json({ instance, url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
