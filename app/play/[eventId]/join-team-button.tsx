"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { joinTeam } from "../actions";

export function JoinTeamButton({ eventId, teamId }: { eventId: string; teamId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => start(() => joinTeam(eventId, teamId))}>
      Join
    </Button>
  );
}
