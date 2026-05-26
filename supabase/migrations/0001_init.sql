-- CTF-as-a-service schema
-- Run in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

-- =====================================================================
-- profiles: one row per auth.users; stores role
-- =====================================================================
create type user_role as enum ('admin', 'organizer', 'participant');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role user_role not null default 'participant',
  created_at timestamptz not null default now()
);

-- Auto-create profile when a user signs up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
-- events: one CTF event, owned by an organizer
-- =====================================================================
create table events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text,
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index events_organizer_idx on events(organizer_id);
create index events_invite_idx on events(invite_code);

-- =====================================================================
-- challenges: the global challenge library (managed by admins)
-- =====================================================================
create type challenge_category as enum ('web', 'crypto', 'forensics', 'pwn', 'misc');
create type challenge_difficulty as enum ('easy', 'medium', 'hard');
create type challenge_type as enum ('static', 'dynamic');

create table challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null,
  category challenge_category not null,
  difficulty challenge_difficulty not null,
  points integer not null check (points >= 0),
  type challenge_type not null default 'static',
  flag text not null,
  file_url text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create index challenges_category_idx on challenges(category);
create index challenges_active_idx on challenges(is_active);

-- =====================================================================
-- event_challenges: which challenges are part of which event
-- =====================================================================
create table event_challenges (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  challenge_id uuid not null references challenges(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (event_id, challenge_id)
);

create index event_challenges_event_idx on event_challenges(event_id);

-- =====================================================================
-- teams: a team within an event
-- =====================================================================
create table teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  invite_code text not null unique default encode(gen_random_bytes(4), 'hex'),
  created_at timestamptz not null default now(),
  unique (event_id, name)
);

create index teams_event_idx on teams(event_id);

-- =====================================================================
-- team_members: users in a team. A user may only be in ONE team per event.
-- =====================================================================
create table team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

-- Enforce one team per (event, user) via a unique partial index on a helper view.
create or replace function check_one_team_per_event()
returns trigger
language plpgsql
as $$
declare
  this_event uuid;
begin
  select event_id into this_event from teams where id = new.team_id;
  if exists (
    select 1 from team_members tm
    join teams t on t.id = tm.team_id
    where tm.user_id = new.user_id
      and t.event_id = this_event
      and tm.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    raise exception 'user already belongs to a team in this event';
  end if;
  return new;
end;
$$;

create trigger team_members_one_per_event
  before insert or update on team_members
  for each row execute function check_one_team_per_event();

-- =====================================================================
-- submissions: every flag submission attempt
-- =====================================================================
create table submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  challenge_id uuid not null references challenges(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  flag text not null,
  is_correct boolean not null,
  submitted_at timestamptz not null default now()
);

create index submissions_team_idx on submissions(team_id);
create index submissions_challenge_idx on submissions(challenge_id);

-- Prevent duplicate correct solves from same team.
create unique index submissions_one_solve_per_team
  on submissions(team_id, challenge_id)
  where is_correct = true;

-- =====================================================================
-- Scoreboard view: aggregate points + last solve time per team
-- =====================================================================
create or replace view scoreboard as
select
  t.id           as team_id,
  t.event_id,
  t.name         as team_name,
  coalesce(sum(c.points) filter (where s.is_correct), 0)::int as total_points,
  count(*) filter (where s.is_correct)                       as solves,
  max(s.submitted_at) filter (where s.is_correct)            as last_solve_at
from teams t
left join submissions s on s.team_id = t.id
left join challenges c  on c.id = s.challenge_id
group by t.id;
