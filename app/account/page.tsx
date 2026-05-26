import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { DisplayNameForm } from "./display-name-form";
import { PasswordForm } from "./password-form";
import { EmailForm } from "./email-form";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const profile = await requireProfile();
  const supabase = createClient();

  // Quick stats (best-effort; RLS keeps the user to their own data).
  const [{ count: solveCount }, { data: pointsRows }, { data: teams }] = await Promise.all([
    supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("is_correct", true),
    supabase
      .from("submissions")
      .select("challenge_id, challenges(points)")
      .eq("user_id", profile.id)
      .eq("is_correct", true),
    supabase
      .from("team_members")
      .select("teams(name, event_id, events(name))")
      .eq("user_id", profile.id),
  ]);

  type PR = { challenges: { points: number } | null };
  const totalPoints = ((pointsRows ?? []) as unknown as PR[])
    .reduce((acc, r) => acc + (r.challenges?.points ?? 0), 0);

  type TM = { teams: { name: string; event_id: string; events: { name: string } | null } | null };
  const memberships = ((teams ?? []) as unknown as TM[])
    .map((m) => m.teams)
    .filter(Boolean) as { name: string; event_id: string; events: { name: string } | null }[];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, password, and email.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How you appear to others.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase text-muted-foreground">role</p>
              <Badge variant="secondary" className="mt-1">{profile.role}</Badge>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">joined</p>
              <p className="font-mono">{formatDate(profile.created_at)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">total solves</p>
              <p className="font-mono">{solveCount ?? 0}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">total points (across events)</p>
              <p className="font-mono">{totalPoints}</p>
            </div>
          </div>

          <DisplayNameForm initial={profile.display_name ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>
            Changing your email sends a confirmation link to the new address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailForm initial={profile.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Your current password is verified before the new one is set.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm email={profile.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teams</CardTitle>
          <CardDescription>Events you're playing in.</CardDescription>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not on any teams yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {memberships.map((m, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span>{m.events?.name ?? "—"}</span>
                  <span className="text-muted-foreground">team: {m.name}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
