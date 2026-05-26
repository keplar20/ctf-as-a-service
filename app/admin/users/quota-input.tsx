"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { updateUserQuota } from "./actions";

export function QuotaInput({
  userId,
  initial,
  disabled,
}: {
  userId: string;
  initial: number;
  disabled?: boolean;
}) {
  const [value, setValue] = useState<number | string>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function save(next: number) {
    if (next === initial) return;
    setError(null);
    setSaved(false);
    start(async () => {
      try {
        await updateUserQuota(userId, next);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "failed");
        setValue(initial);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        className="w-20"
        value={value}
        disabled={pending || disabled}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        onBlur={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n) || n < 0) return setValue(initial);
          save(n);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
      {saved && <span className="text-xs text-emerald-500">saved</span>}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
