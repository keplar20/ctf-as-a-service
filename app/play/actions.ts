"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function joinByCode(formData: FormData) {
  const profile = await requireProfile();
  const code = String(formData.get("code") ?? "").trim();
  if (!code) throw new Error("invite code is required");
  const supabase = createClient();

  // First try as an event invite code.
  const { data: ev } = await supabase.rpc("find_event_by_invite", { p_code: code });
  if (ev && ev.length > 0) {
    redirect(`/play/${ev[0].id}`);
  }

  // Otherwise try as a team invite code.
  const { data: team } = await supabase.rpc("find_team_by_invite", { p_code: code });
  if (team && team.length > 0) {
    const { error } = await supabase
      .from("team_members")
      .insert({ team_id: team[0].id, user_id: profile.id });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    redirect(`/play/${team[0].event_id}`);
  }

  throw new Error("invalid invite code");
}

const CreateTeamSchema = z.object({
  event_id: z.string().uuid(),
  name: z.string().min(1).max(50),
});

export async function createTeam(formData: FormData) {
  const profile = await requireProfile();
  const parsed = CreateTeamSchema.parse({
    event_id: formData.get("event_id"),
    name: formData.get("name"),
  });
  const supabase = createClient();
  const { data: team, error } = await supabase
    .from("teams")
    .insert(parsed)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: memErr } = await supabase
    .from("team_members")
    .insert({ team_id: team!.id, user_id: profile.id });
  if (memErr) throw new Error(memErr.message);

  revalidatePath(`/play/${parsed.event_id}`);
  redirect(`/play/${parsed.event_id}`);
}

export async function joinTeam(eventId: string, teamId: string) {
  const profile = await requireProfile();
  const supabase = createClient();
  const { error } = await supabase
    .from("team_members")
    .insert({ team_id: teamId, user_id: profile.id });
  if (error) throw new Error(error.message);
  revalidatePath(`/play/${eventId}`);
}

export async function submitFlag(formData: FormData) {
  await requireProfile();
  const supabase = createClient();

  const eventId = String(formData.get("event_id"));
  const teamId = String(formData.get("team_id"));
  const challengeId = String(formData.get("challenge_id"));
  const flag = String(formData.get("flag") ?? "");

  const { data, error } = await supabase.rpc("submit_flag", {
    p_team_id: teamId,
    p_challenge_id: challengeId,
    p_flag: flag,
  });
  if (error) throw new Error(error.message);

  const result = (data?.[0] ?? { is_correct: false, already_solved: false, points: 0 }) as {
    is_correct: boolean;
    already_solved: boolean;
    points: number;
  };

  revalidatePath(`/play/${eventId}`);
  revalidatePath(`/play/${eventId}/scoreboard`);

  const flash = result.already_solved
    ? "already_solved"
    : result.is_correct
    ? "correct"
    : "wrong";
  redirect(`/play/${eventId}/challenge/${challengeId}?r=${flash}`);
}
