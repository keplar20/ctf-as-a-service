import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { docker } from "@/lib/docker";

// Hidden by default: noisy infra images that aren't challenges.
const HIDE_PREFIXES = ["traefik", "alpine", "node:", "postgres", "redis", "supabase/"];

type DockerImageSummary = {
  Id: string;
  RepoTags?: string[] | null;
};

type DockerImageInspect = {
  Config?: { ExposedPorts?: Record<string, unknown> | null };
};

export async function GET(req: Request) {
  await requireRole("admin");
  const { searchParams } = new URL(req.url);
  const includeAll = searchParams.get("all") === "1";

  const d = docker();
  let summaries: DockerImageSummary[];
  try {
    summaries = (await d.listImages()) as unknown as DockerImageSummary[];
  } catch (e) {
    const msg = e instanceof Error ? e.message : "docker error";
    return NextResponse.json({ error: msg, images: [] }, { status: 500 });
  }

  // Flatten to one entry per tag, dedupe, filter noise.
  const tags = new Set<string>();
  for (const img of summaries) {
    for (const t of img.RepoTags ?? []) {
      if (!t || t === "<none>:<none>") continue;
      if (!includeAll && HIDE_PREFIXES.some((p) => t.startsWith(p))) continue;
      tags.add(t);
    }
  }

  // Inspect each to extract the exposed port (best-effort; failures = null).
  const out = await Promise.all(
    Array.from(tags)
      .sort()
      .map(async (tag) => {
        try {
          const insp = (await d.getImage(tag).inspect()) as DockerImageInspect;
          const exposed = Object.keys(insp.Config?.ExposedPorts ?? {});
          const port = exposed
            .map((k) => Number(k.split("/")[0]))
            .find((n) => Number.isFinite(n) && n > 0);
          return { tag, port: port ?? null };
        } catch {
          return { tag, port: null };
        }
      })
  );

  return NextResponse.json({ images: out });
}
