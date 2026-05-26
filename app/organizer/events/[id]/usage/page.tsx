import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Event } from "@/lib/types";

export const dynamic = "force-dynamic";

type Usage = {
  event_id: string;
  total_instances: number;
  currently_running: number;
  container_hours: number;
};

type InstanceRow = {
  id: string;
  status: string;
  host: string | null;
  started_at: string;
  stopped_at: string | null;
  expires_at: string;
  teams: { name: string } | null;
  challenges: { title: string; slug: string } | null;
};

export default async function UsagePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = createClient();
  const { data: ev } = await supabase.from("events").select("*").eq("id", params.id).single();
  if (!ev) notFound();
  const event = ev as Event;

  const { data: usageRow } = await supabase
    .from("event_usage")
    .select("*")
    .eq("event_id", params.id)
    .maybeSingle();
  const usage = (usageRow as Usage | null) ?? {
    event_id: params.id,
    total_instances: 0,
    currently_running: 0,
    container_hours: 0,
  };

  const { data: rows } = await supabase
    .from("instances")
    .select("id, status, host, started_at, stopped_at, expires_at, teams(name), challenges(title, slug)")
    .eq("event_id", params.id)
    .order("started_at", { ascending: false })
    .limit(100);
  const instances = (rows ?? []) as unknown as InstanceRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{event.name} — usage</h2>
          <p className="text-sm text-muted-foreground">
            Container hours and running instances for this event.
          </p>
        </div>
        <Link href={`/organizer/events/${event.id}`} className="text-sm underline">← back</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="py-4">
          <p className="text-xs uppercase text-muted-foreground">total instances</p>
          <p className="text-2xl font-semibold">{usage.total_instances}</p>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <p className="text-xs uppercase text-muted-foreground">currently running</p>
          <p className="text-2xl font-semibold">{usage.currently_running}</p>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <p className="text-xs uppercase text-muted-foreground">container hours</p>
          <p className="text-2xl font-semibold">{Number(usage.container_hours ?? 0).toFixed(2)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-muted/30">
              <tr className="text-left">
                <th className="px-4 py-2">Team</th>
                <th className="px-4 py-2">Challenge</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Host</th>
                <th className="px-4 py-2">Started</th>
                <th className="px-4 py-2">Stopped / expires</th>
              </tr>
            </thead>
            <tbody>
              {instances.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No instances yet.
                </td></tr>
              )}
              {instances.map((i) => (
                <tr key={i.id} className="border-b border-border/30 last:border-0">
                  <td className="px-4 py-2">{i.teams?.name ?? "—"}</td>
                  <td className="px-4 py-2">{i.challenges?.title ?? "—"}</td>
                  <td className="px-4 py-2">
                    {i.status === "running" && <Badge variant="success">running</Badge>}
                    {i.status === "starting" && <Badge variant="warn">starting</Badge>}
                    {i.status === "stopped" && <Badge variant="secondary">stopped</Badge>}
                    {i.status === "error" && <Badge variant="danger">error</Badge>}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{i.host ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{formatDate(i.started_at)}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {i.stopped_at ? formatDate(i.stopped_at) : `exp ${formatDate(i.expires_at)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
