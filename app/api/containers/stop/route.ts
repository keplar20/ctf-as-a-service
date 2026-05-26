import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { stopInstance } from "@/lib/instances";

const Body = z.object({ instance_id: z.string().uuid() });

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Verify caller is on the team that owns this instance.
  const { data: inst } = await supabase
    .from("instances")
    .select("id, team_id")
    .eq("id", body.instance_id)
    .single();
  if (!inst) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: mem } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("team_id", inst.team_id)
    .maybeSingle();
  if (!mem) return NextResponse.json({ error: "not on this team" }, { status: 403 });

  try {
    await stopInstance(body.instance_id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
