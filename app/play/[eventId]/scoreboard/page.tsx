import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { TimelineChart, type TeamSeries } from "./timeline-chart";
import type { Event, ScoreboardRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TimelineRow = {
  event_id: string;
  team_id: string;
  team_name: string;
  submitted_at: string;
  cumulative_points: number;
};

export default async function ScoreboardPage(props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  const supabase = createClient();
  const { data: ev } = await supabase.from("events").select("*").eq("id", params.eventId).single();
  if (!ev) notFound();
  const event = ev as Event;

  const [{ data }, { data: timelineRows }] = await Promise.all([
    supabase.from("scoreboard").select("*").eq("event_id", params.eventId),
    supabase
      .from("scoreboard_timeline")
      .select("*")
      .eq("event_id", params.eventId)
      .order("submitted_at", { ascending: true }),
  ]);

  // Group timeline rows by team for the chart.
  const seriesByTeam = new Map<string, TeamSeries>();
  for (const r of (timelineRows ?? []) as TimelineRow[]) {
    let s = seriesByTeam.get(r.team_id);
    if (!s) {
      s = { teamId: r.team_id, teamName: r.team_name, series: [] };
      seriesByTeam.set(r.team_id, s);
    }
    s.series.push({ t: Date.parse(r.submitted_at), score: r.cumulative_points });
  }
  const teamSeries = Array.from(seriesByTeam.values());

  const rows = ((data ?? []) as ScoreboardRow[]).sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    // Earlier last_solve_at wins ties (got there first).
    const at = a.last_solve_at ? Date.parse(a.last_solve_at) : Infinity;
    const bt = b.last_solve_at ? Date.parse(b.last_solve_at) : Infinity;
    return at - bt;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{event.name} — scoreboard</h2>
          <p className="text-sm text-muted-foreground">Ranked by points; ties broken by earliest last solve.</p>
        </div>
        <Link href={`/play/${event.id}`} className="text-sm underline">← back</Link>
      </div>

      <TimelineChart teams={teamSeries} />

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2 w-12">#</th>
                <th className="px-4 py-2">Team</th>
                <th className="px-4 py-2 text-right">Points</th>
                <th className="px-4 py-2 text-right">Solves</th>
                <th className="px-4 py-2">Last solve</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No teams yet.</td></tr>
              )}
              {rows.map((r, i) => (
                <tr key={r.team_id} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    {i === 0 ? <Badge>1</Badge> : <span className="text-muted-foreground">{i + 1}</span>}
                  </td>
                  <td className="px-4 py-2 font-medium">{r.team_name}</td>
                  <td className="px-4 py-2 text-right font-mono">{r.total_points}</td>
                  <td className="px-4 py-2 text-right">{r.solves}</td>
                  <td className="px-4 py-2 text-muted-foreground">{formatDate(r.last_solve_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
