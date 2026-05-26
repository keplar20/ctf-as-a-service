"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDisplayName } from "./actions";

export function DisplayNameForm({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => {
        setError(null);
        setSaved(false);
        start(async () => {
          try {
            await updateDisplayName(fd);
            setSaved(true);
          } catch (e) {
            setError(e instanceof Error ? e.message : "failed");
          }
        });
      }}
      className="space-y-3"
    >
      <div className="space-y-1.5">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          name="display_name"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          required
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || value === initial}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {saved && <span className="text-sm text-emerald-500">Saved.</span>}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </form>
  );
}
