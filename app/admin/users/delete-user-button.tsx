"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteUser } from "./actions";

export function DeleteUserButton({ userId, email }: { userId: string; email: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="destructive"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            `Delete ${email}? This removes the auth account and all owned events / teams / submissions (via cascade). Cannot be undone.`
          )
        ) return;
        start(async () => {
          try {
            await deleteUser(userId);
          } catch (e) {
            alert(e instanceof Error ? e.message : "failed");
          }
        });
      }}
    >
      Delete
    </Button>
  );
}
