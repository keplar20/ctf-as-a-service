-- Dynamic challenges: per-team running container instances.

-- Add image + default port columns to challenges.
alter table challenges
  add column if not exists image       text,
  add column if not exists container_port integer default 80;

create type instance_status as enum ('starting', 'running', 'stopped', 'error');

create table if not exists instances (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  team_id       uuid not null references teams(id) on delete cascade,
  challenge_id  uuid not null references challenges(id) on delete cascade,
  status        instance_status not null default 'starting',
  container_id  text,
  network_name  text,
  host          text,                       -- e.g. t-abcd-c-xyz.localtest.me
  flag          text not null,              -- unique per (team, challenge) instance
  error_msg     text,
  started_at    timestamptz not null default now(),
  stopped_at    timestamptz,
  expires_at    timestamptz not null
);

create index if not exists instances_team_idx       on instances(team_id);
create index if not exists instances_challenge_idx  on instances(challenge_id);
create index if not exists instances_status_idx     on instances(status);
create index if not exists instances_event_idx      on instances(event_id);

-- Only one running instance per (team, challenge).
create unique index if not exists instances_one_running_per_team_chal
  on instances(team_id, challenge_id)
  where status in ('starting', 'running');

alter table instances enable row level security;

drop policy if exists instances_admin_all on instances;
create policy instances_admin_all on instances
  for all using (is_admin()) with check (is_admin());

drop policy if exists instances_team_read on instances;
create policy instances_team_read on instances
  for select using (is_team_member(team_id));

drop policy if exists instances_organizer_read on instances;
create policy instances_organizer_read on instances
  for select using (is_team_event_organizer(team_id));

-- Inserts/updates/deletes happen via SECURITY DEFINER RPCs only; no direct policy.

-- =====================================================================
-- submit_flag RPC: now handles BOTH static and dynamic challenges.
-- For dynamic: validate against the team's instance flag, not challenges.flag.
-- =====================================================================
create or replace function submit_flag(
  p_team_id      uuid,
  p_challenge_id uuid,
  p_flag         text
)
returns table (is_correct boolean, already_solved boolean, points integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chal        challenges%rowtype;
  v_event_id    uuid;
  v_is_correct  boolean := false;
  v_already     boolean;
  v_expected    text;
begin
  if not exists (
    select 1 from team_members
    where team_id = p_team_id and user_id = auth.uid()
  ) then
    raise exception 'not a member of this team';
  end if;

  select t.event_id into v_event_id from teams t where t.id = p_team_id;
  if not exists (
    select 1 from event_challenges
    where event_id = v_event_id and challenge_id = p_challenge_id
  ) then
    raise exception 'challenge is not part of this event';
  end if;

  select * into v_chal from challenges where id = p_challenge_id;

  if v_chal.type = 'static' then
    v_expected := v_chal.flag;
  else
    -- Dynamic: look up the team's current (or most recent) instance flag.
    select i.flag into v_expected
    from instances i
    where i.team_id = p_team_id
      and i.challenge_id = p_challenge_id
    order by i.started_at desc
    limit 1;

    if v_expected is null then
      raise exception 'no instance has been started for this challenge';
    end if;
  end if;

  v_is_correct := (trim(p_flag) = trim(v_expected));

  v_already := exists (
    select 1 from submissions
    where team_id = p_team_id
      and challenge_id = p_challenge_id
      and is_correct = true
  );

  if v_is_correct and v_already then
    return query select true, true, v_chal.points;
    return;
  end if;

  insert into submissions (team_id, challenge_id, user_id, flag, is_correct)
  values (p_team_id, p_challenge_id, auth.uid(), p_flag, v_is_correct);

  return query select v_is_correct, false, v_chal.points;
end;
$$;

grant execute on function submit_flag(uuid, uuid, text) to authenticated;

-- =====================================================================
-- Usage metering view: container-hours per event.
-- (started_at..stopped_at, or started_at..now() if still running)
-- =====================================================================
create or replace view event_usage as
select
  i.event_id,
  count(*)                                                    as total_instances,
  count(*) filter (where i.status in ('starting','running'))  as currently_running,
  sum(
    extract(epoch from (coalesce(i.stopped_at, now()) - i.started_at)) / 3600.0
  )::numeric(12, 4)                                           as container_hours
from instances i
group by i.event_id;

grant select on event_usage to authenticated;
