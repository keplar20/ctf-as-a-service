"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateFlagPrefix } from "../../actions";

export function FlagPrefixForm({ eventId, initial }: { eventId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const dirty = value !== initial;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedAt(null);
    start(async () => {
      try {
        await updateFlagPrefix(eventId, value);
        setSavedAt(initial !== value ? value : null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "failed");
        setValue(initial);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex items-end gap-2 flex-wrap">
        <div className="space-y-1.5">
          <Label htmlFor="flag-prefix">Flag prefix</Label>
          <Input
            id="flag-prefix"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSavedAt(null);
              setError(null);
            }}
            className="w-40 font-mono"
            placeholder="ctf"
            disabled={pending}
          />
        </div>
        <Button type="submit" size="sm" disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save prefix"}
        </Button>
        <p className="pb-2 text-sm text-muted-foreground">
          preview:{" "}
          <code className="font-mono">{value || "ctf"}{`{...}`}</code>
        </p>
        {savedAt && (
          <p className="pb-2 text-sm text-emerald-500">saved — new dynamic flags use this prefix</p>
        )}
        {error && <p className="pb-2 text-sm text-destructive">{error}</p>}
      </div>
      <p className="text-xs text-muted-foreground">
        1–32 chars, letters / numbers / <code>_</code> / <code>-</code>.
        Affects per-team flags generated when a dynamic instance starts.
        Static challenges keep whatever flag the admin set in the library.
      </p>
    </form>
  );
}
