-- Row Level Security policies.
-- The general model:
--   admin       -> full access to challenges/events
--   organizer   -> manages their own events; selects challenge library
--   participant -> read assigned event content; write own team/submissions

-- Helper: current user's role.
-- (Named app_user_role to avoid clashing with Postgres' built-in current_role.)
create or replace function app_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean language sql stable as $$
  select app_user_role() = 'admin';
$$;

-- =====================================================================
-- profiles
-- =====================================================================
alter table profiles enable row level security;

create policy profiles_self_read on profiles
  for select using (auth.uid() = id or is_admin());

create policy profiles_self_update on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy profiles_admin_all on profiles
  for all using (is_admin()) with check (is_admin());

-- =====================================================================
-- challenges
-- =====================================================================
alter table challenges enable row level security;

-- Admins: full CRUD.
create policy challenges_admin_all on challenges
  for all using (is_admin()) with check (is_admin());

-- Organizers: may read the active challenge library to build events.
create policy challenges_organizer_read on challenges
  for select using (
    app_user_role() = 'organizer' and is_active = true
  );

-- Participants: may read challenges that belong to an event their team is in.
create policy challenges_participant_read on challenges
  for select using (
    exists (
      select 1
      from event_challenges ec
      join teams t on t.event_id = ec.event_id
      join team_members tm on tm.team_id = t.id
      where ec.challenge_id = challenges.id
        and tm.user_id = auth.uid()
    )
  );

-- =====================================================================
-- events
-- =====================================================================
alter table events enable row level security;

create policy events_admin_all on events
  for all using (is_admin()) with check (is_admin());

-- Organizer owns their events.
create policy events_organizer_rw on events
  for all using (organizer_id = auth.uid())
  with check (organizer_id = auth.uid() and app_user_role() in ('organizer','admin'));

-- Participants: read events they belong to (via a team).
create policy events_participant_read on events
  for select using (
    exists (
      select 1 from teams t
      join team_members tm on tm.team_id = t.id
      where t.event_id = events.id and tm.user_id = auth.uid()
    )
  );

-- Anyone signed-in can look up an event by invite_code (needed for join flow).
-- We expose only via a SECURITY DEFINER RPC instead of a broad policy.

-- =====================================================================
-- event_challenges
-- =====================================================================
alter table event_challenges enable row level security;

create policy event_challenges_admin_all on event_challenges
  for all using (is_admin()) with check (is_admin());

create policy event_challenges_organizer_rw on event_challenges
  for all using (
    exists (select 1 from events e
            where e.id = event_id and e.organizer_id = auth.uid())
  )
  with check (
    exists (select 1 from events e
            where e.id = event_id and e.organizer_id = auth.uid())
  );

create policy event_challenges_participant_read on event_challenges
  for select using (
    exists (
      select 1 from teams t
      join team_members tm on tm.team_id = t.id
      where t.event_id = event_challenges.event_id
        and tm.user_id = auth.uid()
    )
  );

-- =====================================================================
-- teams
-- =====================================================================
alter table teams enable row level security;

create policy teams_admin_all on teams
  for all using (is_admin()) with check (is_admin());

-- Organizer can read/manage teams in their event.
create policy teams_organizer_rw on teams
  for all using (
    exists (select 1 from events e where e.id = event_id and e.organizer_id = auth.uid())
  )
  with check (
    exists (select 1 from events e where e.id = event_id and e.organizer_id = auth.uid())
  );

-- Any signed-in user may read teams to browse them for joining; create their own team.
create policy teams_signed_in_read on teams
  for select using (auth.uid() is not null);

create policy teams_participant_create on teams
  for insert with check (auth.uid() is not null);

-- =====================================================================
-- team_members
-- =====================================================================
alter table team_members enable row level security;

create policy team_members_admin_all on team_members
  for all using (is_admin()) with check (is_admin());

create policy team_members_self_read on team_members
  for select using (user_id = auth.uid()
                    or exists (select 1 from team_members tm2
                               where tm2.team_id = team_members.team_id
                                 and tm2.user_id = auth.uid()));

create policy team_members_self_join on team_members
  for insert with check (user_id = auth.uid());

create policy team_members_self_leave on team_members
  for delete using (user_id = auth.uid());

create policy team_members_organizer_read on team_members
  for select using (
    exists (
      select 1 from teams t
      join events e on e.id = t.event_id
      where t.id = team_members.team_id and e.organizer_id = auth.uid()
    )
  );

-- =====================================================================
-- submissions
-- =====================================================================
alter table submissions enable row level security;

create policy submissions_admin_all on submissions
  for all using (is_admin()) with check (is_admin());

-- A user may only insert submissions for a team they belong to.
create policy submissions_team_insert on submissions
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from team_members tm
      where tm.team_id = submissions.team_id and tm.user_id = auth.uid()
    )
  );

-- Team members may read their team's submissions.
create policy submissions_team_read on submissions
  for select using (
    exists (
      select 1 from team_members tm
      where tm.team_id = submissions.team_id and tm.user_id = auth.uid()
    )
  );

create policy submissions_organizer_read on submissions
  for select using (
    exists (
      select 1 from teams t
      join events e on e.id = t.event_id
      where t.id = submissions.team_id and e.organizer_id = auth.uid()
    )
  );

-- =====================================================================
-- Scoreboard view: grant select to authenticated users.
-- The underlying tables already gate visibility via RLS.
-- =====================================================================
grant select on scoreboard to authenticated;
