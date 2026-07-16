TEST repo

# CTF-as-a-Service

A Next.js 14 + Supabase app for running capture-the-flag events end to end.

- **Admins** curate a global challenge library (CRUD, file uploads, publish/unpublish).
- **Organizers** create events and assemble them from the library.
- **Participants** join an event with an invite code, form a team, submit flags, and watch a live scoreboard.
- **Dynamic challenges** spin up an isolated Docker container per team with a unique flag, accessible at a unique subdomain, auto-destroyed after a TTL.

## Tech

- Next.js 14 (App Router, Server Actions)
- TypeScript + Tailwind + shadcn-style UI primitives
- Supabase (Postgres + Auth + Storage), RLS-first

## Setup

### 1. Create a Supabase project

1. Create a project at <https://supabase.com/>.
2. In **Project settings → API**, copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### 2. Configure env

```bash
cp .env.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Apply the schema

In the Supabase SQL editor, run the files in `supabase/migrations/` in order:

1. `0001_init.sql` — tables, enums, scoreboard view, triggers
2. `0002_rls.sql` — RLS policies
3. `0003_rpc.sql` — `submit_flag`, `find_event_by_invite`, `find_team_by_invite`
4. `0004_storage.sql` — `challenge-files` storage bucket + policies
5. `0005_fix_rls_recursion.sql` — helper functions to break RLS cycles
6. `0006_dynamic_instances.sql` — `instances` table, updated `submit_flag`, usage view

Optional: `supabase/seed.sql` adds a few sample challenges (after step 5 so an admin exists).

### 4. Auth config

In **Authentication → URL Configuration**, set:

- Site URL: `http://localhost:3000`
- Additional redirect URLs: `http://localhost:3000/auth/callback`

For magic links, set up SMTP under **Authentication → Email**.

### 5. Promote your admin user

Sign up at `/signup`, then in the SQL editor:

```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

Promote others to `organizer` similarly.

### 6. Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## End-to-end walkthrough

1. **Admin** signs in, opens `/admin/challenges`, creates a few challenges, uploads any attachments, publishes them.
2. **Organizer** signs in, opens `/organizer`, creates an event, opens it, clicks "Add from library", and picks challenges (filterable by category/difficulty).
3. Organizer shares the event's **invite code** (or the `/join/<code>` link).
4. **Participant** signs up, lands on `/play`, pastes the invite code, lands on the event page, creates or joins a team.
5. Participant opens a challenge, submits a flag — gets correct/wrong feedback.
6. Anyone in the event opens `/play/<eventId>/scoreboard` to see live rankings (points, solves, last-solve tiebreaker).

## Dynamic challenges (local Docker)

This runs each dynamic challenge as a throwaway Docker container per team, with
a unique flag, a unique subdomain, and an auto-destroy TTL. No K8s, no cluster
to manage — just your local Docker daemon and a Traefik sidecar.

### Prerequisites

- Docker (Docker Desktop or OrbStack on Mac)
- `~/.docker/config.json` writable (default)

### One-time setup

1. **Start Traefik + the shared network**:
   ```bash
   ./infra/setup.sh
   ```
   This pulls `traefik:v3.1`, creates a Docker network, and starts Traefik on
   host port 80 (configurable via `DYNAMIC_TRAEFIK_PORT` in `.env.local`).
   Dashboard at <http://localhost:8081/dashboard/>.

2. **Build the sample challenge image**:
   ```bash
   docker build -t ctfaas/web-cookie:latest ./examples/web-cookie
   ```

3. **In the admin UI**, create a challenge with:
   - **type**: `dynamic`
   - **Docker image**: `ctfaas/web-cookie:latest`
   - **Container port**: `80`
   - **Flag**: anything (placeholder — the real flag is generated per team)
   Publish it and add it to your event.

### Running

Two processes:

```bash
# terminal 1: app
npm run dev

# terminal 2: TTL janitor (deletes containers past expires_at)
./infra/cron.sh
```

A participant opens the challenge → clicks **Start instance** → after ~2s they
get a unique URL like `http://t-abc123-c-web-coo-def4.localtest.me`. Their flag
is in the `admin_note` cookie on that page. Paste it into the submit box.

### How it works

- `POST /api/containers/start` → generates a random flag, inserts an `instances`
  row, calls Docker to: (1) create a per-instance Docker network, (2) create
  a container with Traefik labels + `FLAG` env var + 256 MiB / 0.5 CPU limits,
  (3) attach the shared network so Traefik can reach it, (4) start it.
- `localtest.me` always resolves to 127.0.0.1, so no DNS setup is needed.
  Traefik routes by `Host` header to the right container.
- `submit_flag` RPC now branches: static → compares to `challenges.flag`;
  dynamic → compares to the team's `instances.flag`.
- `/api/cron/cleanup` (called by `infra/cron.sh` every 60s) stops + removes
  containers and their per-instance networks once `expires_at` has passed.
- Organizers see container hours and currently-running instances at
  `/organizer/events/<id>/usage`.

### Tearing down

```bash
./infra/teardown.sh
```

Removes Traefik, all `ctf.managed=true` containers, and per-instance networks.

## Schema overview

| Table | Purpose |
|---|---|
| `profiles` | mirrors `auth.users`, holds `role` (admin/organizer/participant) |
| `events` | one CTF event, owned by an organizer; has invite code |
| `challenges` | global challenge library |
| `event_challenges` | join table: challenges assigned to an event |
| `teams` | a team within an event |
| `team_members` | users in a team; enforced at most one team per (event,user) |
| `submissions` | every flag attempt; unique partial index prevents duplicate solves |
| `instances` | running container per (team, challenge) for dynamic challenges |
| `scoreboard` (view) | per-team aggregate: points, solve count, last solve time |
| `event_usage` (view) | per-event aggregate: container hours, currently running |

### Security model

- Flag values live in `challenges.flag` and are **never selected by clients**. Submissions go through the `submit_flag` SQL RPC (`security definer`), which compares server-side and writes the submission row.
- RLS gates every table. Participants can only see challenges in events their team is in.
- Storage bucket `challenge-files` is publicly readable (so attachments work without signed URLs) but only admin-writable.

## Project layout

```
app/
  admin/            admin-only challenge CRUD
  organizer/        organizer event + library mgmt
  play/             participant flow (join, team, challenges, scoreboard)
  join/[code]/      invite-link landing
  auth/callback/    OAuth/magic link callback
  login, signup
components/         UI primitives + site header
lib/
  supabase/         browser, server, and service-role clients
  auth.ts           requireProfile / requireRole helpers
  types.ts          shared enums + row types
middleware.ts       session refresh + route guards
lib/docker.ts       dockerode client
lib/instances.ts    start/stop/reap dynamic-challenge containers
infra/              setup.sh, teardown.sh, cron.sh — Docker + Traefik plumbing
examples/web-cookie/ minimal dynamic challenge image
supabase/migrations/  SQL migrations
```
