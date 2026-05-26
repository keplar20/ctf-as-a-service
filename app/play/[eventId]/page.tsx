import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTeam, joinTeam } from "../actions";
import { JoinTeamButton } from "./join-team-button";
import { groupByCategory, sortChallenges } from "@/lib/utils";
import type { Event, Challenge, Team } from "@/lib/types";

export default async function EventPlayPage(props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  const profile = await requireProfile();
  const supabase = createClient();

  const { data: ev } = await supabase.from("events").select("*").eq("id", params.eventId).single();
  if (!ev) notFound();
  const event = ev as Event;

  // Find this user's team in this event (if any).
  const { data: myMembership } = await supabase
    .from("team_members")
    .select("team_id, teams!inner(id, name, event_id, invite_code)")
    .eq("user_id", profile.id)
    .eq("teams.event_id", params.eventId)
    .maybeSingle();

  const myTeam = (myMembership?.teams as unknown as Team) ?? null;

  if (!myTeam) {
    const { data: existing } = await supabase
      .from("teams")
      .select("*")
      .eq("event_id", params.eventId)
      .order("created_at");
    const teams = (existing ?? []) as Team[];

    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-2xl font-semibold">{event.name}</h2>
          {event.description && <p className="text-muted-foreground">{event.description}</p>}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create a team</CardTitle>
            <CardDescription>You'll be the first member. Share the team invite code to add teammates.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createTeam} className="flex gap-2">
              <input type="hidden" name="event_id" value={event.id} />
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="name" className="sr-only">Team name</Label>
                <Input id="name" name="name" placeholder="team name" required />
              </div>
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Or join an existing team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {teams.length === 0 && <p className="text-sm text-muted-foreground">No teams yet.</p>}
            {teams.map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{t.name}</span>
                  <p className="text-xs text-muted-foreground">code: <code>{t.invite_code}</code></p>
                </div>
                <JoinTeamButton eventId={event.id} teamId={t.id} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Has a team — show challenges.
  const { data: ecs } = await supabase
    .from("event_challenges")
    .select("challenges(*)")
    .eq("event_id", event.id);
  const challenges = sortChallenges(
    (ecs ?? []).map((r) => r.challenges as unknown as Challenge).filter(Boolean)
  );
  const grouped = groupByCategory(challenges);

  const { data: solved } = await supabase
    .from("submissions")
    .select("challenge_id")
    .eq("team_id", myTeam.id)
    .eq("is_correct", true);
  const solvedSet = new Set((solved ?? []).map((s) => s.challenge_id));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{event.name}</h2>
          {event.description && <p className="text-muted-foreground">{event.description}</p>}
          <p className="text-sm text-muted-foreground mt-2">
            Team: <span className="font-medium">{myTeam.name}</span> · invite code:{" "}
            <code>{myTeam.invite_code}</code>
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/play/${event.id}/scoreboard`}>Scoreboard</Link>
        </Button>
      </div>

      {challenges.length === 0 && (
        <Card><CardContent className="py-6 text-sm text-muted-foreground">
          No challenges have been added to this event yet.
        </CardContent></Card>
      )}

      {grouped.map(([category, items]) => (
        <section key={category} className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold uppercase tracking-wider text-primary">
              {category}
            </h3>
            <span className="text-xs text-muted-foreground">
              {items.filter((c) => solvedSet.has(c.id)).length} / {items.length} solved
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((c) => {
              const isSolved = solvedSet.has(c.id);
              return (
                <Card key={c.id} className={isSolved ? "border-primary/50" : ""}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">
                        <Link href={`/play/${event.id}/challenge/${c.id}`} className="hover:underline">
                          {c.title}
                        </Link>
                      </CardTitle>
                      {isSolved && <Badge variant="success">solved</Badge>}
                    </div>
                    <CardDescription className="flex flex-wrap gap-1">
                      <Badge variant="outline">{c.difficulty}</Badge>
                      <Badge variant="outline">{c.points} pts</Badge>
                      {c.type === "dynamic" && <Badge variant="outline">dynamic</Badge>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">{c.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
