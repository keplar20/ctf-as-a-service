"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type StatusInstance = {
  id: string;
  status: "starting" | "running" | "stopped" | "error";
  host: string | null;
  url: string | null;
  expires_at: string;
};

export function DynamicPanel({
  teamId,
  challengeId,
}: {
  teamId: string;
  challengeId: string;
}) {
  const [inst, setInst] = useState<StatusInstance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  async function refresh() {
    const res = await fetch(
      `/api/containers/status?team_id=${teamId}&challenge_id=${challengeId}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    setInst(data.instance);
  }

  useEffect(() => {
    refresh();
  }, [teamId, challengeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (inst?.status === "starting") {
      const t = setInterval(refresh, 2000);
      return () => clearInterval(t);
    }
  }, [inst?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/containers/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ team_id: teamId, challenge_id: challengeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  }

  async function stop() {
    if (!inst) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/containers/stop", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instance_id: inst.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  }

  const isLive = inst && (inst.status === "starting" || inst.status === "running");
  const remaining = inst?.expires_at
    ? Math.max(0, Math.floor((Date.parse(inst.expires_at) - now) / 1000))
    : 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">instance:</span>
          {!inst && <Badge variant="secondary">not started</Badge>}
          {inst?.status === "starting" && <Badge variant="warn">starting…</Badge>}
          {inst?.status === "running" && <Badge variant="success">running</Badge>}
          {inst?.status === "stopped" && <Badge variant="secondary">stopped</Badge>}
          {inst?.status === "error" && <Badge variant="danger">error</Badge>}
        </div>
        {isLive ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm tabular-nums">
              {mm}:{ss}
            </span>
            <Button size="sm" variant="outline" disabled={loading} onClick={stop}>
              Stop
            </Button>
          </div>
        ) : (
          <Button size="sm" disabled={loading} onClick={start}>
            {loading ? "Starting…" : "Start instance"}
          </Button>
        )}
      </div>

      {inst?.url && inst.status === "running" && (
        <div className="text-sm">
          your url:{" "}
          <a
            href={inst.url}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline break-all"
          >
            {inst.url}
          </a>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
