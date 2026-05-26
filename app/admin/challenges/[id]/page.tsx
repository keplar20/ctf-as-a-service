import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChallengeForm } from "../challenge-form";
import { updateChallenge } from "../actions";
import type { Challenge } from "@/lib/types";

export default async function EditChallengePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = createClient();
  const { data } = await supabase.from("challenges").select("*").eq("id", params.id).single();
  if (!data) notFound();
  const challenge = data as Challenge;

  const action = updateChallenge.bind(null, params.id);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Edit: {challenge.title}</h2>
      <ChallengeForm initial={challenge} action={action} submitLabel="Save" />
    </div>
  );
}
