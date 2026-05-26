#!/usr/bin/env bash
# Stand up Traefik + a shared Docker network for dynamic challenges.
# Run once. Idempotent — safe to re-run.
set -euo pipefail

# Load .env.local if present (optional, gives sane defaults).
if [[ -f .env.local ]]; then
  # shellcheck disable=SC1091
  set -a; . .env.local; set +a
fi

NETWORK="${DOCKER_NETWORK:-ctf-net}"
PORT="${DYNAMIC_TRAEFIK_PORT:-80}"
TRAEFIK_NAME="ctf-traefik"

echo "▶ Ensuring Docker network: $NETWORK"
docker network inspect "$NETWORK" >/dev/null 2>&1 \
  || docker network create "$NETWORK"

echo "▶ Pulling Traefik"
docker pull traefik:v3.1

# Stop any existing Traefik for a clean restart.
if docker inspect "$TRAEFIK_NAME" >/dev/null 2>&1; then
  echo "▶ Removing previous $TRAEFIK_NAME"
  docker rm -f "$TRAEFIK_NAME" >/dev/null
fi

echo "▶ Starting Traefik on host port $PORT"
docker run -d \
  --name "$TRAEFIK_NAME" \
  --restart unless-stopped \
  --network "$NETWORK" \
  -p "${PORT}:80" \
  -p "127.0.0.1:8081:8080" \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  traefik:v3.1 \
  --providers.docker=true \
  --providers.docker.exposedbydefault=false \
  --providers.docker.network="$NETWORK" \
  --entrypoints.web.address=:80 \
  --api.insecure=true \
  --log.level=INFO

echo
echo "✓ Traefik is up."
echo "  Dashboard: http://localhost:8081/dashboard/"
echo "  Test:      curl -s -H 'Host: nothing.localtest.me' http://localhost:${PORT} | head -1"
echo
echo "Next: start the app (npm run dev), then in another terminal: ./infra/cron.sh"
