#!/usr/bin/env bash
# Poll the cleanup endpoint every 60s. Run alongside `npm run dev`.
set -euo pipefail

if [[ -f .env.local ]]; then
  set -a; . .env.local; set +a
fi
URL="${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}/api/cron/cleanup"
SECRET="${CRON_SECRET:?CRON_SECRET must be set in .env.local}"

echo "▶ Polling $URL every 60s. Ctrl+C to stop."
while true; do
  out=$(curl -sS -X POST -H "x-cron-secret: $SECRET" "$URL" || echo "{\"error\":\"unreachable\"}")
  echo "[$(date '+%H:%M:%S')] $out"
  sleep 60
done
