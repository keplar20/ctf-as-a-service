-- Break RLS recursion by wrapping cross-table membership/ownership checks
-- in SECURITY DEFINER functions. Functions created by the postgres role
-- bypass RLS, so the policies stop triggering each other.

create or replace function is_event_organizer(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from events
    where id = p_event_id and organizer_id = auth.uid()
  );
$$;

create or replace function is_event_member(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from teams t
    join team_members tm on tm.team_id = t.id
    where t.event_id = p_event_id and tm.user_id = auth.uid()
  );
$$;

create or replace function is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from team_members
    where team_id = p_team_id and user_id = auth.uid()
  );
$$;

create or replace function is_team_event_organizer(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from teams t
    join events e on e.id = t.event_id
    where t.id = p_team_id and e.organizer_id = auth.uid()
  );
$$;

-- =====================================================================
-- events
-- =====================================================================
drop policy if exists events_participant_read on events;
create policy events_participant_read on events
  for select using (is_event_member(id));

-- =====================================================================
-- teams
-- =====================================================================
drop policy if exists teams_organizer_rw on teams;
create policy teams_organizer_rw on teams
  for all using (is_event_organizer(event_id))
  with check (is_event_organizer(event_id));

-- =====================================================================
-- event_challenges
-- =====================================================================
drop policy if exists event_challenges_organizer_rw on event_challenges;
create policy event_challenges_organizer_rw on event_challenges
  for all using (is_event_organizer(event_id))
  with check (is_event_organizer(event_id));

drop policy if exists event_challenges_participant_read on event_challenges;
create policy event_challenges_participant_read on event_challenges
  for select using (is_event_member(event_id));

-- =====================================================================
-- challenges
-- =====================================================================
drop policy if exists challenges_participant_read on challenges;
create policy challenges_participant_read on challenges
  for select using (
    exists (
      select 1 from event_challenges ec
      where ec.challenge_id = challenges.id
        and is_event_member(ec.event_id)
    )
  );

-- =====================================================================
-- team_members
-- =====================================================================
drop policy if exists team_members_self_read on team_members;
create policy team_members_self_read on team_members
  for select using (
    user_id = auth.uid() or is_team_member(team_id)
  );

drop policy if exists team_members_organizer_read on team_members;
create policy team_members_organizer_read on team_members
  for select using (is_team_event_organizer(team_id));

-- =====================================================================
-- submissions
-- =====================================================================
drop policy if exists submissions_team_insert on submissions;
create policy submissions_team_insert on submissions
  for insert with check (
    user_id = auth.uid() and is_team_member(team_id)
  );

drop policy if exists submissions_team_read on submissions;
create policy submissions_team_read on submissions
  for select using (is_team_member(team_id));

drop policy if exists submissions_organizer_read on submissions;
create policy submissions_organizer_read on submissions
  for select using (is_team_event_organizer(team_id));
