import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Challenge } from "@/lib/types";

export const dynamic = "force-dynamic";

type EventRef = { id: string; name: string; flag_prefix: string };

export default async function OrganizerChallengePreview(
  props: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ event?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const profile = await requireRole(["organizer", "admin"]);
  const supabase = createClient();

  const { data } = await supabase.from("challenges").select("*").eq("id", params.id).single();
  if (!data) notFound();
  const c = data as Challenge;

  // Build the list of "this challenge rendered for event X" rows.
  // Priority: ?event=<id> → just that event. Otherwise all of this organizer's events.
  let eventRows: EventRef[] = [];
  if (searchParams.event) {
    const { data: ev } = await supabase
      .from("events")
      .select("id, name, flag_prefix")
      .eq("id", searchParams.event)
      .single();
    if (ev) eventRows = [ev as EventRef];
  } else {
    const { data: evs } = await supabase
      .from("events")
      .select("id, name, flag_prefix")
      .eq("organizer_id", profile.id)
      .order("created_at", { ascending: false });
    eventRows = ((evs ?? []) as EventRef[]).slice(0, 5);
  }

  const backHref = searchParams.event
    ? `/organizer/events/${searchParams.event}`
    : "/organizer";
  const backLabel = searchParams.event ? "back to event" : "organizer";

  return (
    <div className="max-w-3xl space-y-4">
      <Link href={backHref} className="text-sm underline">← {backLabel}</Link>

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">{c.title}</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{c.category}</Badge>
          <Badge variant="outline">{c.difficulty}</Badge>
          <Badge variant="outline">{c.points} pts</Badge>
          <Badge variant="outline">{c.type}</Badge>
          <Badge variant={c.is_active ? "success" : "secondary"}>
            {c.is_active ? "published" : "draft"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground font-mono">{c.slug}</p>
      </div>

      <Card>
        <CardContent className="py-4 space-y-4">
          <div>
            <p className="text-xs uppercase text-muted-foreground mb-1">Description</p>
            <p className="text-sm whitespace-pre-wrap">{c.description}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase text-muted-foreground">
              {c.type === "static" ? "Flag (wrapped per event)" : "Per-team flag (generated at instance start)"}
            </p>
            <p className="text-xs text-muted-foreground">
              Stored body: <code>{c.flag}</code>
            </p>
            {c.type === "static" ? (
              eventRows.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Create an event first — the wrapped flag depends on the event's prefix.
                </p>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-xs uppercase text-muted-foreground">
                      <th className="pb-1 pr-3">Event</th>
                      <th className="pb-1 pr-3">Prefix</th>
                      <th className="pb-1">Effective flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventRows.map((e) => (
                      <tr key={e.id} className="border-t border-border/50">
                        <td className="py-1.5 pr-3">{e.name}</td>
                        <td className="py-1.5 pr-3 font-mono">{e.flag_prefix}</td>
                        <td className="py-1.5 break-all">
                          <code>{e.flag_prefix}{`{${c.flag}}`}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              <p className="text-xs text-muted-foreground">
                Dynamic flags look like{" "}
                <code>
                  {eventRows[0]?.flag_prefix ?? "ctf"}{`{<event>_<team>_<chal>_<random>}`}
                </code>
                {" "}— unique per team, served via the container's <code>FLAG</code> env var.
              </p>
            )}
          </div>

          {c.file_url && (
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Attachment</p>
              <a href={c.file_url} target="_blank" rel="noreferrer" className="text-sm underline break-all">
                {c.file_url}
              </a>
            </div>
          )}

          {c.type === "dynamic" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">Docker image</p>
                <code>{c.image ?? "—"}</code>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">Container port</p>
                <code>{c.container_port ?? "—"}</code>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground pt-2 border-t border-border">
            created {formatDate(c.created_at)}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Preview only — challenges live in the global library and are maintained by admins.
        Need a tweak? Ask an admin to update the challenge or add a new one.
      </p>
    </div>
  );
}
