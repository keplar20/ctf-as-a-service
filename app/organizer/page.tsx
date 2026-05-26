import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createEvent } from "./actions";
import type { Event } from "@/lib/types";

export default async function OrganizerHome() {
  const profile = await requireRole(["organizer", "admin"]);
  const supabase = createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("organizer_id", profile.id)
    .order("created_at", { ascending: false });
  const events = (data ?? []) as Event[];

  const isAdmin = profile.role === "admin";
  const used = events.length;
  const quota = profile.event_quota;
  const atLimit = !isAdmin && used >= quota;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-semibold">Create event</h2>
          {!isAdmin && (
            <p className="text-sm text-muted-foreground">
              <span className={atLimit ? "text-destructive" : "text-foreground"}>
                {used} / {quota}
              </span>{" "}
              events used
            </p>
          )}
        </div>
        <Card>
          <CardContent className="pt-6">
            {atLimit ? (
              <div className="space-y-2 text-sm">
                <p className="text-destructive">
                  You've reached your event quota ({used} / {quota}).
                </p>
                <p className="text-muted-foreground">
                  Ask an admin to grant more event slots, or delete an existing event to free one up.
                </p>
              </div>
            ) : (
              <form action={createEvent} className="space-y-3 max-w-xl">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" rows={3} />
                </div>
                <Button type="submit">Create</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Your events</h2>
        <div className="grid gap-3">
          {events.length === 0 && (
            <Card><CardContent className="py-6 text-sm text-muted-foreground">No events yet.</CardContent></Card>
          )}
          {events.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div>
                  <Link href={`/organizer/events/${e.id}`} className="font-medium hover:underline">{e.name}</Link>
                  <p className="text-xs text-muted-foreground">
                    Invite code: <code className="font-mono">{e.invite_code}</code>
                  </p>
                </div>
                <Badge variant={e.is_active ? "success" : "secondary"}>
                  {e.is_active ? "active" : "inactive"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
