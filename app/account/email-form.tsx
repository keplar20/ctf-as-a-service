"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmailForm({ initial }: { initial: string }) {
  const [email, setEmail] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (email === initial) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email });
    setLoading(false);

    if (error) return setError(error.message);
    setInfo(
      "Confirmation email sent. Click the link from your new address to finish the change."
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setInfo(null);
          }}
          required
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading || email === initial}>
          {loading ? "Sending…" : "Change email"}
        </Button>
        {info && <span className="text-sm text-emerald-500">{info}</span>}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </form>
  );
}
