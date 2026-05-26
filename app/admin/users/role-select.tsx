"use client";

import { useTransition, useState } from "react";
import { Select } from "@/components/ui/select";
import type { Role } from "@/lib/types";
import { updateUserRole } from "./actions";

export function RoleSelect({
  userId,
  currentRole,
  disabled,
}: {
  userId: string;
  currentRole: Role;
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState<Role>(currentRole);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value}
        disabled={pending || disabled}
        onChange={(e) => {
          const next = e.target.value as Role;
          const prev = value;
          setValue(next);
          setError(null);
          start(async () => {
            try {
              await updateUserRole(userId, next);
            } catch (err) {
              setValue(prev);
              setError(err instanceof Error ? err.message : "failed");
            }
          });
        }}
        className="w-36"
      >
        <option value="participant">participant</option>
        <option value="organizer">organizer</option>
        <option value="admin">admin</option>
      </Select>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
