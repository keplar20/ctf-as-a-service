import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { AddChallengeButton } from "./add-challenge-button";
import { groupByCategory } from "@/lib/utils";
import { CATEGORIES, DIFFICULTIES, type Category, type Challenge, type Difficulty } from "@/lib/types";

type Search = { category?: Category; difficulty?: Difficulty };

export default async function LibraryPage(
  props: {
    params: Promise<{ id: string }>;
    searchParams: Promise<Search>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const supabase = createClient();

  let q = supabase.from("challenges").select("*").eq("is_active", true);
  if (searchParams.category) q = q.eq("category", searchParams.category);
  if (searchParams.difficulty) q = q.eq("difficulty", searchParams.difficulty);
  const { data: challs } = await q;

  const { data: ecs } = await supabase
    .from("event_challenges")
    .select("challenge_id")
    .eq("event_id", params.id);
  const alreadyAdded = new Set((ecs ?? []).map((r) => r.challenge_id));

  const challenges = (challs ?? []) as Challenge[];
  const grouped = groupByCategory(challenges);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Challenge library</h2>
        <Link href={`/organizer/events/${params.id}`} className="text-sm underline">← back to event</Link>
      </div>

      <form className="flex items-center gap-3" action="" method="get">
        <label className="text-sm">Category
          <Select name="category" defaultValue={searchParams.category ?? ""} className="ml-2 inline-flex w-auto">
            <option value="">all</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </label>
        <label className="text-sm">Difficulty
          <Select name="difficulty" defaultValue={searchParams.difficulty ?? ""} className="ml-2 inline-flex w-auto">
            <option value="">all</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </label>
        <button className="text-sm underline" type="submit">Apply</button>
      </form>

      {challenges.length === 0 && (
        <Card><CardContent className="py-6 text-sm text-muted-foreground">
          No published challenges match those filters.
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
            {items.map((c) => {
              const added = alreadyAdded.has(c.id);
              return (
                <Card key={c.id}>
                  <CardContent className="flex items-center justify-between gap-3 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/organizer/challenges/${c.id}?event=${params.id}`}
                          className="font-medium hover:underline"
                        >
                          {c.title}
                        </Link>
                        <Badge variant="outline">{c.difficulty}</Badge>
                        <Badge variant="outline">{c.points} pts</Badge>
                        {c.type === "dynamic" && <Badge variant="outline">dynamic</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl">{c.description}</p>
                    </div>
                    <AddChallengeButton eventId={params.id} challengeId={c.id} added={added} />
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
