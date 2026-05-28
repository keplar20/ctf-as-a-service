import "server-only";
import Docker from "dockerode";

let _docker: Docker | null = null;

/**
 * Returns a cached dockerode client.
 *
 * If DOCKER_HOST is set (e.g. `ssh://ctf@challenges.example.com`,
 * `tcp://host:2376`, or `unix:///var/run/docker.sock`), dockerode picks it up
 * automatically. Otherwise we fall back to the local Unix socket.
 *
 * SSH transport reuses the standard SSH key resolution (~/.ssh/id_*,
 * ssh-agent) — no extra config needed beyond making sure the app host can
 * `ssh ctf@host docker ps` interactively.
 */
export function docker(): Docker {
  if (_docker) return _docker;
  if (process.env.DOCKER_HOST) {
    _docker = new Docker();
  } else {
    const socketPath = process.env.DOCKER_SOCKET || "/var/run/docker.sock";
    _docker = new Docker({ socketPath });
  }
  return _docker;
}

export function sharedNetwork(): string {
  return process.env.DOCKER_NETWORK || "ctf-net";
}

export function baseDomain(): string {
  return process.env.NEXT_PUBLIC_DYNAMIC_BASE_DOMAIN || "localtest.me";
}

export function ttlSeconds(): number {
  return Number(process.env.DYNAMIC_TTL_SECONDS || 7200);
}
