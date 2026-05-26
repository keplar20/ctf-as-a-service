import "server-only";
import Docker from "dockerode";

let _docker: Docker | null = null;

export function docker(): Docker {
  if (_docker) return _docker;
  const socketPath = process.env.DOCKER_SOCKET || "/var/run/docker.sock";
  _docker = new Docker({ socketPath });
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
