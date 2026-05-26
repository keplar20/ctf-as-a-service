"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { removeChallengeFromEvent } from "../../actions";

export function RemoveChallengeButton({ eventId, challengeId }: { eventId: string; challengeId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => start(() => removeChallengeFromEvent(eventId, challengeId))}
    >
      Remove
    </Button>
  );
}
