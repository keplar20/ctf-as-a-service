"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { addChallengeToEvent, removeChallengeFromEvent } from "../../../actions";

export function AddChallengeButton({
  eventId,
  challengeId,
  added,
}: {
  eventId: string;
  challengeId: string;
  added: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={added ? "outline" : "default"}
      disabled={pending}
      onClick={() =>
        start(() =>
          added
            ? removeChallengeFromEvent(eventId, challengeId)
            : addChallengeToEvent(eventId, challengeId)
        )
      }
    >
      {added ? "Remove" : "Add"}
    </Button>
  );
}
