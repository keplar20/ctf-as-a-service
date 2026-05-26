import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TogglePublishButton } from "./toggle-publish-button";
import { DeleteChallengeButton } from "./delete-challenge-button";
import { groupByCategory } from "@/lib/utils";
import type { Challenge } from "@/lib/types";

export default async function AdminChallengesPage() {
  const supabase = createClient();
  const { data } = await supabase.from("challenges").select("*");
  const challenges = (data ?? []) as Challenge[];
  const grouped = groupByCategory(challenges);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Challenge library</h2>
        <Button asChild>
          <Link href="/admin/challenges/new">New challenge</Link>
        </Button>
      </div>

      {challenges.length === 0 && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No challenges yet. Create your first one to get started.
          </CardContent>
        </Card>
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
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/challenges/${c.id}`} className="font-medium hover:underline">
                        {c.title}
                      </Link>
                      <Badge variant="outline">{c.difficulty}</Badge>
                      <Badge variant="outline">{c.points} pts</Badge>
                      {c.type === "dynamic" && <Badge variant="outline">dynamic</Badge>}
                      <Badge variant={c.is_active ? "success" : "secondary"}>
                        {c.is_active ? "published" : "draft"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TogglePublishButton id={c.id} isActive={c.is_active} />
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/challenges/${c.id}`}>Edit</Link>
                    </Button>
                    <DeleteChallengeButton id={c.id} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
