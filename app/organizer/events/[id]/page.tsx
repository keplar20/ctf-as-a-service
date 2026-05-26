import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { removeChallengeFromEvent } from "../../actions";
import { RemoveChallengeButton } from "./remove-challenge-button";
import { FlagPrefixForm } from "./flag-prefix-form";
import { groupByCategory } from "@/lib/utils";
import type { Event, Challenge } from "@/lib/types";

export default async function EventPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = createClient();
  const { data: ev } = await supabase.from("events").select("*").eq("id", params.id).single();
  if (!ev) notFound();
  const event = ev as Event;

  const { data: ecs } = await supabase
    .from("event_challenges")
    .select("challenge_id, challenges(*)")
    .eq("event_id", params.id);

  const challenges = (ecs ?? [])
    .map((r) => r.challenges as unknown as Challenge)
    .filter(Boolean);
  const grouped = groupByCategory(challenges);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{event.name}</h2>
        {event.description && <p className="text-muted-foreground">{event.description}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Share with players</CardTitle>
          <CardDescription>Players can join with this invite code.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <code className="font-mono text-lg bg-muted px-3 py-1 rounded">{event.invite_code}</code>
            <Button asChild variant="outline" size="sm">
              <Link href={`/join/${event.invite_code}`}>Open join link</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/play/${event.id}/scoreboard`}>Scoreboard</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/organizer/events/${event.id}/usage`}>Usage</Link>
            </Button>
          </div>
          <FlagPrefixForm eventId={event.id} initial={event.flag_prefix} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Challenges in this event ({challenges.length})</h3>
        <Button asChild>
          <Link href={`/organizer/events/${event.id}/library`}>Add from library</Link>
        </Button>
      </div>

      {challenges.length === 0 && (
        <Card><CardContent className="py-6 text-sm text-muted-foreground">
          No challenges added yet. Pick some from the library.
        </CardContent></Card>
      )}

      {grouped.map(([category, items]) => (
        <section key={category} className="space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
              {category}
            </h3>
            <span className="text-xs text-muted-foreground">{items.length}</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-2">
            {items.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/organizer/challenges/${c.id}?event=${event.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.title}
                    </Link>
                    <Badge variant="outline">{c.difficulty}</Badge>
                    <Badge variant="outline">{c.points} pts</Badge>
                    {c.type === "dynamic" && <Badge variant="outline">dynamic</Badge>}
                  </div>
                  <RemoveChallengeButton eventId={event.id} challengeId={c.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
