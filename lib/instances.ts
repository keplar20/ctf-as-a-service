import "server-only";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { docker, sharedNetwork, baseDomain, ttlSeconds } from "@/lib/docker";

const SHORT_LEN = 6;

function shortId(): string {
  return randomBytes(4).toString("hex").slice(0, SHORT_LEN);
}

function generateFlag(prefix: string, eventId: string, teamId: string, chalId: string): string {
  const e = eventId.slice(0, 8);
  const t = teamId.slice(0, 8);
  const c = chalId.slice(0, 8);
  const r = randomBytes(8).toString("hex");
  return `${prefix}{${e}_${t}_${c}_${r}}`;
}

function buildHost(teamId: string, chalSlug: string): string {
  return `t-${teamId.slice(0, 6)}-c-${chalSlug.slice(0, 12)}-${shortId()}.${baseDomain()}`;
}

type Instance = {
  id: string;
  event_id: string;
  team_id: string;
  challenge_id: string;
  status: "starting" | "running" | "stopped" | "error";
  container_id: string | null;
  network_name: string | null;
  host: string | null;
  flag: string;
  error_msg: string | null;
  started_at: string;
  stopped_at: string | null;
  expires_at: string;
};

type Challenge = {
  id: string;
  slug: string;
  type: "static" | "dynamic";
  image: string | null;
  container_port: number;
};

/**
 * Start an instance: creates a dedicated docker network, container, and DB row.
 * Returns the instance row + its URL.
 */
export async function startInstance(opts: {
  eventId: string;
  teamId: string;
  challengeId: string;
}): Promise<{ instance: Instance; url: string }> {
  const sb = createAdminClient();

  // Verify challenge is dynamic and has an image.
  const { data: chalRow, error: chalErr } = await sb
    .from("challenges")
    .select("id, slug, type, image, container_port")
    .eq("id", opts.challengeId)
    .single();
  if (chalErr || !chalRow) throw new Error("challenge not found");
  const chal = chalRow as Challenge;
  if (chal.type !== "dynamic") throw new Error("challenge is not dynamic");
  if (!chal.image) throw new Error("challenge has no docker image configured");

  // Fetch the event's flag prefix (defaults to 'ctf').
  const { data: eventRow } = await sb
    .from("events")
    .select("flag_prefix")
    .eq("id", opts.eventId)
    .single();
  const flagPrefix = (eventRow as { flag_prefix?: string } | null)?.flag_prefix ?? "ctf";

  // If there's already a running/starting instance for this team+challenge, return it.
  const { data: existing } = await sb
    .from("instances")
    .select("*")
    .eq("team_id", opts.teamId)
    .eq("challenge_id", opts.challengeId)
    .in("status", ["starting", "running"])
    .maybeSingle();
  if (existing) {
    const inst = existing as Instance;
    return { instance: inst, url: inst.host ? `http://${inst.host}` : "" };
  }

  const flag = generateFlag(flagPrefix, opts.eventId, opts.teamId, opts.challengeId);
  const host = buildHost(opts.teamId, chal.slug);
  const expiresAt = new Date(Date.now() + ttlSeconds() * 1000).toISOString();

  // Insert the DB row first so we don't orphan containers if Docker call dies mid-flight.
  const { data: created, error: insErr } = await sb
    .from("instances")
    .insert({
      event_id: opts.eventId,
      team_id: opts.teamId,
      challenge_id: opts.challengeId,
      status: "starting",
      flag,
      host,
      expires_at: expiresAt,
    })
    .select("*")
    .single();
  if (insErr || !created) throw new Error(insErr?.message ?? "could not create instance row");
  let instance = created as Instance;

  try {
    const d = docker();
    const sharedNet = sharedNetwork();

    // 1) Ensure image is present locally.
    try {
      await d.getImage(chal.image).inspect();
    } catch {
      // pull (no auth — local registry only for now)
      await new Promise<void>((resolve, reject) => {
        d.pull(chal.image!, (err: Error | null, stream: NodeJS.ReadableStream) => {
          if (err) return reject(err);
          d.modem.followProgress(stream, (e) => (e ? reject(e) : resolve()));
        });
      });
    }

    // 2) Per-instance isolation network.
    const netName = `ctfi-${instance.id.slice(0, 8)}`;
    const net = await d.createNetwork({
      Name: netName,
      Driver: "bridge",
      Internal: false,
      Labels: { "ctf.managed": "true", "ctf.instance": instance.id },
    });

    // 3) Container with Traefik labels.
    const router = `ctfi-${instance.id.slice(0, 8)}`;
    const container = await d.createContainer({
      Image: chal.image,
      name: `ctfi-${instance.id.slice(0, 8)}`,
      Env: [`FLAG=${flag}`],
      Labels: {
        "ctf.managed": "true",
        "ctf.instance": instance.id,
        "ctf.team": opts.teamId,
        "ctf.challenge": opts.challengeId,
        "ctf.expires_at": expiresAt,
        "traefik.enable": "true",
        [`traefik.http.routers.${router}.rule`]: `Host(\`${host}\`)`,
        [`traefik.http.routers.${router}.entrypoints`]: "web",
        [`traefik.http.services.${router}.loadbalancer.server.port`]: String(chal.container_port ?? 80),
        "traefik.docker.network": sharedNet,
      },
      HostConfig: {
        NetworkMode: netName,
        Memory: 256 * 1024 * 1024,
        NanoCpus: 500_000_000, // 0.5 CPU
        RestartPolicy: { Name: "no" },
        AutoRemove: false,
      },
    });

    // 4) Attach the shared network too (so Traefik can reach it).
    await d.getNetwork(sharedNet).connect({ Container: container.id });

    // 5) Start.
    await container.start();

    // 6) Mark running.
    const { data: updated } = await sb
      .from("instances")
      .update({
        status: "running",
        container_id: container.id,
        network_name: netName,
      })
      .eq("id", instance.id)
      .select("*")
      .single();
    instance = (updated as Instance) ?? { ...instance, status: "running", container_id: container.id, network_name: netName };

    return { instance, url: `http://${host}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await sb
      .from("instances")
      .update({ status: "error", error_msg: msg, stopped_at: new Date().toISOString() })
      .eq("id", instance.id);
    throw err;
  }
}

/**
 * Stop an instance: kill the container, remove the per-instance network, mark DB row.
 */
export async function stopInstance(instanceId: string): Promise<void> {
  const sb = createAdminClient();
  const { data: row, error } = await sb
    .from("instances")
    .select("*")
    .eq("id", instanceId)
    .single();
  if (error || !row) throw new Error("instance not found");
  const inst = row as Instance;
  if (inst.status === "stopped") return;

  const d = docker();
  if (inst.container_id) {
    try {
      await d.getContainer(inst.container_id).remove({ force: true });
    } catch {
      // already gone — ignore
    }
  }
  if (inst.network_name) {
    try {
      await d.getNetwork(inst.network_name).remove();
    } catch {
      // already gone — ignore
    }
  }
  await sb
    .from("instances")
    .update({ status: "stopped", stopped_at: new Date().toISOString() })
    .eq("id", instanceId);
}

/**
 * Periodic cleanup: stop instances past their expires_at.
 */
export async function reapExpired(): Promise<{ stopped: number }> {
  const sb = createAdminClient();
  const { data: expired } = await sb
    .from("instances")
    .select("id")
    .lt("expires_at", new Date().toISOString())
    .in("status", ["starting", "running"]);
  const rows = (expired ?? []) as Array<{ id: string }>;
  let n = 0;
  for (const r of rows) {
    try {
      await stopInstance(r.id);
      n++;
    } catch {
      // already-stopped or docker error — skip
    }
  }
  return { stopped: n };
}

/**
 * Fetch the team's current instance for a challenge (or null).
 */
export async function getInstance(teamId: string, challengeId: string): Promise<Instance | null> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("instances")
    .select("*")
    .eq("team_id", teamId)
    .eq("challenge_id", challengeId)
    .in("status", ["starting", "running"])
    .maybeSingle();
  return (data as Instance) ?? null;
}
