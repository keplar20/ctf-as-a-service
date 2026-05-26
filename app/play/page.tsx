import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinByCode } from "./actions";

export default async function PlayHome() {
  const profile = await requireProfile();
  const supabase = createClient();

  // Events the user is in (via team membership).
  const { data: memberships } = await supabase
    .from("team_members")
    .select("teams(event_id, name, events(id, name))")
    .eq("user_id", profile.id);

  type Row = { teams: { name: string; events: { id: string; name: string } | null } | null };
  const events = (memberships as Row[] | null)
    ?.map((m) => m.teams)
    .filter((t): t is NonNullable<Row["teams"]> => Boolean(t?.events))
    .map((t) => ({ id: t!.events!.id, name: t!.events!.name, teamName: t!.name }))
    ?? [];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Join an event</CardTitle>
          <CardDescription>Paste the invite code your organizer shared.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={joinByCode} className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="code" className="sr-only">Invite code</Label>
              <Input id="code" name="code" placeholder="invite code" required />
            </div>
            <Button type="submit">Join</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your events</CardTitle>
          <CardDescription>Events your team is a member of.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
          {events.map((e) => (
            <div key={e.id} className="flex items-center justify-between">
              <div>
                <Link href={`/play/${e.id}`} className="font-medium hover:underline">{e.name}</Link>
                <p className="text-xs text-muted-foreground">team: {e.teamName}</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={`/play/${e.id}`}>Open</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
