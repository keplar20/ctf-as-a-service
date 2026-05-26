import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export default async function JoinByCode(props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect(`/login?redirect=${encodeURIComponent(`/join/${params.code}`)}`);
  }

  const supabase = createClient();
  const { data: ev } = await supabase.rpc("find_event_by_invite", { p_code: params.code });
  if (ev && ev.length > 0) redirect(`/play/${ev[0].id}`);

  const { data: team } = await supabase.rpc("find_team_by_invite", { p_code: params.code });
  if (team && team.length > 0) {
    await supabase.from("team_members").insert({ team_id: team[0].id, user_id: profile!.id });
    redirect(`/play/${team[0].event_id}`);
  }

  return (
    <div className="max-w-md space-y-2">
      <h2 className="text-xl font-semibold">Invalid invite</h2>
      <p className="text-muted-foreground text-sm">
        The code <code>{params.code}</code> doesn't match any event or team.
      </p>
    </div>
  );
}
