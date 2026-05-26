#!/usr/bin/env bash
# Tear down Traefik and remove any leftover challenge containers.
set -euo pipefail

if [[ -f .env.local ]]; then
  set -a; . .env.local; set +a
fi
NETWORK="${DOCKER_NETWORK:-ctf-net}"

echo "▶ Stopping any containers labeled ctf.managed=true"
ids=$(docker ps -aq --filter 'label=ctf.managed=true' || true)
if [[ -n "$ids" ]]; then
  docker rm -f $ids
fi

echo "▶ Removing Traefik"
docker rm -f ctf-traefik 2>/dev/null || true

echo "▶ Pruning per-instance networks"
nets=$(docker network ls --filter 'label=ctf.managed=true' -q || true)
if [[ -n "$nets" ]]; then
  docker network rm $nets || true
fi

echo "▶ Removing shared network $NETWORK (if unused)"
docker network rm "$NETWORK" 2>/dev/null || true

echo "✓ Done."
