"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createUser } from "./actions";

function randomPassword(len = 14) {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!$%@";
  let out = "";
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    for (const v of arr) out += chars[v % chars.length];
  } else {
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function CreateUserForm() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState(randomPassword());
  const [role, setRole] = useState("participant");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {open ? "New user" : ""}
        </h3>
        <Button size="sm" variant={open ? "outline" : "default"} onClick={() => {
          setOpen(!open);
          setOk(null);
          setError(null);
        }}>
          {open ? "Cancel" : "+ Add user"}
        </Button>
      </div>

      {open && (
        <form
          action={(fd) => {
            setError(null);
            setOk(null);
            start(async () => {
              try {
                await createUser(fd);
                setOk(`Created ${fd.get("email")}. Share password with them.`);
                setPassword(randomPassword());
                (document.getElementById("new-user-email") as HTMLInputElement | null)?.focus();
              } catch (e) {
                setError(e instanceof Error ? e.message : "failed");
              }
            });
          }}
          className="grid gap-3 md:grid-cols-5 rounded-md border border-border bg-card p-3"
        >
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="new-user-email" className="text-xs">Email</Label>
            <Input id="new-user-email" name="email" type="email" required autoComplete="off" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="new-user-password" className="text-xs">
              Password{" "}
              <button
                type="button"
                className="ml-1 underline text-muted-foreground"
                onClick={() => setPassword(randomPassword())}
              >
                regenerate
              </button>
            </Label>
            <Input
              id="new-user-password"
              name="password"
              type="text"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-display-name" className="text-xs">Display name</Label>
            <Input id="new-user-display-name" name="display_name" placeholder="(optional)" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-role" className="text-xs">Role</Label>
            <Select id="new-user-role" name="role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="participant">participant</option>
              <option value="organizer">organizer</option>
              <option value="admin">admin</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-quota" className="text-xs">Event quota</Label>
            <Input
              id="new-user-quota"
              name="event_quota"
              type="number"
              min={0}
              defaultValue={0}
              disabled={role === "admin"}
              title={role === "admin" ? "admins are unlimited" : ""}
            />
          </div>

          <div className="md:col-span-5 flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create user"}
            </Button>
            {ok && <span className="text-sm text-emerald-500">{ok}</span>}
            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
