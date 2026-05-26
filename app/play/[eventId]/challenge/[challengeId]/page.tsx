import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitFlag } from "@/app/play/actions";
import { DynamicPanel } from "./dynamic-panel";
import type { Challenge, Event, Team } from "@/lib/types";

export default async function ChallengePlay(
  props: {
    params: Promise<{ eventId: string; challengeId: string }>;
    searchParams: Promise<{ r?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const profile = await requireProfile();
  const supabase = createClient();

  const [{ data: ch }, { data: ev }] = await Promise.all([
    supabase.from("challenges").select("*").eq("id", params.challengeId).single(),
    supabase.from("events").select("flag_prefix").eq("id", params.eventId).single(),
  ]);
  if (!ch) notFound();
  const challenge = ch as Challenge;
  const eventPrefix = ((ev as Pick<Event, "flag_prefix"> | null)?.flag_prefix) ?? "ctf";

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id, teams!inner(id, name, event_id)")
    .eq("user_id", profile.id)
    .eq("teams.event_id", params.eventId)
    .maybeSingle();

  const team = (membership?.teams as unknown as Team) ?? null;
  if (!team) {
    return (
      <div className="space-y-2">
        <p>You need to be on a team in this event to view challenges.</p>
        <Link href={`/play/${params.eventId}`} className="underline">Pick a team →</Link>
      </div>
    );
  }

  const { data: lastSolve } = await supabase
    .from("submissions")
    .select("submitted_at")
    .eq("team_id", team.id)
    .eq("challenge_id", challenge.id)
    .eq("is_correct", true)
    .maybeSingle();

  const result = searchParams.r;

  return (
    <div className="max-w-2xl space-y-4">
      <Link href={`/play/${params.eventId}`} className="text-sm underline">← back</Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{challenge.title}</CardTitle>
            {lastSolve && <Badge variant="success">solved</Badge>}
          </div>
          <CardDescription className="flex gap-2 pt-1">
            <Badge variant="outline">{challenge.category}</Badge>
            <Badge variant="outline">{challenge.difficulty}</Badge>
            <Badge variant="outline">{challenge.points} pts</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-sm">{challenge.description}</p>
          {challenge.file_url && (
            <p className="text-sm">
              Attachment:{" "}
              <a href={challenge.file_url} target="_blank" rel="noreferrer" className="underline">
                download
              </a>
            </p>
          )}

          {challenge.type === "dynamic" && (
            <DynamicPanel teamId={team.id} challengeId={challenge.id} />
          )}

          {result === "correct" && (
            <p className="text-sm text-emerald-600">✅ Correct! +{challenge.points} points.</p>
          )}
          {result === "already_solved" && (
            <p className="text-sm text-muted-foreground">Already solved by your team.</p>
          )}
          {result === "wrong" && (
            <p className="text-sm text-destructive">❌ Wrong flag. Try again.</p>
          )}

          <form action={submitFlag} className="flex gap-2">
            <input type="hidden" name="event_id" value={params.eventId} />
            <input type="hidden" name="team_id" value={team.id} />
            <input type="hidden" name="challenge_id" value={challenge.id} />
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="flag" className="sr-only">Flag</Label>
              <Input id="flag" name="flag" placeholder={`${eventPrefix}{...}`} required />
            </div>
            <Button type="submit">Submit</Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Submit format for this event: <code>{eventPrefix}{`{...}`}</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
