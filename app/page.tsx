import Link from "next/link";
import { Box, Flag, LineChart, Lock, Sparkles, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth";

const FEATURES = [
  {
    icon: Lock,
    title: "Zero infrastructure",
    body: "We run the servers, the containers, the scoreboard. You bring the players. No Docker, no Postgres, no late-night ops.",
  },
  {
    icon: Box,
    title: "Per-team isolated containers",
    body: "Dynamic web/pwn challenges spin up a fresh container per team — unique flag, unique URL, auto-destroyed after the round. No setup on your end.",
  },
  {
    icon: Flag,
    title: "Brand every event",
    body: "Set your own flag format per event — KTH{}, NIL{}, anything. Same library of challenges, your identity.",
  },
  {
    icon: LineChart,
    title: "Live timeline scoreboard",
    body: "Real-time stepped chart of teams climbing the leaderboard. Built in — no third-party widgets to embed.",
  },
  {
    icon: Sparkles,
    title: "Ready-made challenge library",
    body: "Curated challenges across web, crypto, forensics, pwn, and misc. Pick from the library and arrange — no authoring required to launch your first event.",
  },
  {
    icon: Terminal,
    title: "Made by Hacker for everyone",
    body: "Hosting a CTF shouldn't require a team of developers. With our library of ready-to-play challenges, anyone can launch a seamless cybersecurity competition in minutes. Just register, set your date, and run your event—no elite hacking skills required.",
  },
];

export default async function HomePage() {
  const profile = await getCurrentProfile();

  return (
    <div className="space-y-12">
      <section className="space-y-3">
        <p className="text-xs text-muted-foreground">
          ~/ctf $ <span className="text-primary">whoami</span>
        </p>
        <h1 className="text-3xl font-bold tracking-tight prompt">
          run a CTF. skip the infrastructure.
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          spin up an event in minutes. pick from a ready-made challenge library.
          dynamic challenges run in isolated containers per team — we handle all of it.
          you just share the invite code.
        </p>
        {!profile && (
          <div className="flex gap-3 pt-2">
            <Button asChild><Link href="/signup">Get started</Link></Button>
            <Button asChild variant="outline"><Link href="/login">Sign in</Link></Button>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
            why this one
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4 text-primary" />
                    {f.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {f.body}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
            how it works
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organize an event</CardTitle>
              <CardDescription>Run a CTF for your team, club, or company</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Sign up, get an event slot, pick challenges from the library, set your
                flag prefix, share the invite code. Watch usage and scoreboard in real time.
              </p>
              <p className="text-xs">
                Event slots are paid per event — pay once, run the CTF, done.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Join an event</CardTitle>
              <CardDescription>Solve, submit, climb</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Got an invite from an organizer? Sign up free, form or join a team,
              browse challenges grouped by category, submit flags, and watch your
              team rise on the live scoreboard.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
            pricing
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <Card>
          <CardContent className="py-6 space-y-3">
            <h3 className="text-xl font-semibold">Simple — pay per event.</h3>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Players are always free. Organizers buy event slots — one slot, one CTF.
              No per-seat fees, no annual contracts, no surprises. Run one event a year
              or one every week, you only pay for what you use.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              {!profile && (
                <Button asChild><Link href="/signup">Start free</Link></Button>
              )}
              <Button asChild variant="outline">
                <Link href="mailto:hello@example.com?subject=CTF%20event%20pricing">
                  Talk to us about volume
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {profile && (
        <section className="flex gap-3">
          {profile.role === "admin" && (
            <Button asChild><Link href="/admin/challenges">Open admin panel</Link></Button>
          )}
          {(profile.role === "organizer" || profile.role === "admin") && (
            <Button asChild variant="outline"><Link href="/organizer">My events</Link></Button>
          )}
          <Button asChild variant="outline"><Link href="/play">Play</Link></Button>
        </section>
      )}
    </div>
  );
}
