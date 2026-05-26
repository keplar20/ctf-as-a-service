"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

const FLAG_PREFIX_RE = /^[A-Za-z0-9_-]{1,32}$/;

const EventSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
});

const EventPrefixSchema = z.object({
  flag_prefix: z
    .string()
    .regex(FLAG_PREFIX_RE, "1–32 chars, letters / numbers / _ / - only"),
});

export async function createEvent(formData: FormData) {
  const profile = await requireRole(["organizer", "admin"]);
  const supabase = createClient();

  const parsed = EventSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  // Quota check: admins bypass; organizers limited to event_quota.
  if (profile.role !== "admin") {
    const { count } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("organizer_id", profile.id);
    const used = count ?? 0;
    if (used >= profile.event_quota) {
      throw new Error(
        `event quota reached (${used}/${profile.event_quota}). ask an admin to grant more slots.`
      );
    }
  }

  const { data, error } = await supabase
    .from("events")
    .insert({ ...parsed, organizer_id: profile.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/organizer");
  redirect(`/organizer/events/${data!.id}`);
}

export async function addChallengeToEvent(eventId: string, challengeId: string) {
  await requireRole(["organizer", "admin"]);
  const supabase = createClient();
  const { error } = await supabase
    .from("event_challenges")
    .insert({ event_id: eventId, challenge_id: challengeId });
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
  revalidatePath(`/organizer/events/${eventId}`);
  revalidatePath(`/organizer/events/${eventId}/library`);
}

export async function removeChallengeFromEvent(eventId: string, challengeId: string) {
  await requireRole(["organizer", "admin"]);
  const supabase = createClient();
  const { error } = await supabase
    .from("event_challenges")
    .delete()
    .eq("event_id", eventId)
    .eq("challenge_id", challengeId);
  if (error) throw new Error(error.message);
  revalidatePath(`/organizer/events/${eventId}`);
  revalidatePath(`/organizer/events/${eventId}/library`);
}

export async function updateFlagPrefix(eventId: string, prefix: string) {
  await requireRole(["organizer", "admin"]);
  const parsed = EventPrefixSchema.parse({ flag_prefix: prefix });
  const supabase = createClient();
  const { error } = await supabase
    .from("events")
    .update({ flag_prefix: parsed.flag_prefix })
    .eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/organizer/events/${eventId}`);
}
