"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { togglePublish } from "./actions";

export function TogglePublishButton({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={isActive ? "secondary" : "default"}
      disabled={pending}
      onClick={() => start(() => togglePublish(id, !isActive))}
    >
      {isActive ? "Unpublish" : "Publish"}
    </Button>
  );
}
