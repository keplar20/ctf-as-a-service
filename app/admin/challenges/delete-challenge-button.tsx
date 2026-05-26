"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteChallenge } from "./actions";

export function DeleteChallengeButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this challenge? This cannot be undone.")) return;
        start(() => deleteChallenge(id));
      }}
    >
      Delete
    </Button>
  );
}
