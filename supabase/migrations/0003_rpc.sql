-- RPCs for server-side flag checking and event joining.
-- We use SECURITY DEFINER so the function can read challenges.flag
-- even when the caller's RLS would normally hide it.

-- =====================================================================
-- submit_flag: insert a submission row and return correctness.
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
  v_flag        text;
  v_points      integer;
  v_is_correct  boolean;
  v_already     boolean;
  v_event_id    uuid;
begin
  -- Verify caller is in the team.
  if not exists (
    select 1 from team_members
    where team_id = p_team_id and user_id = auth.uid()
  ) then
    raise exception 'not a member of this team';
  end if;

  -- Verify challenge is part of the team's event.
  select t.event_id into v_event_id from teams t where t.id = p_team_id;
  if not exists (
    select 1 from event_challenges
    where event_id = v_event_id and challenge_id = p_challenge_id
  ) then
    raise exception 'challenge is not part of this event';
  end if;

  select flag, points into v_flag, v_points
  from challenges where id = p_challenge_id;

  v_is_correct := (trim(p_flag) = trim(v_flag));

  v_already := exists (
    select 1 from submissions
    where team_id = p_team_id
      and challenge_id = p_challenge_id
      and is_correct = true
  );

  -- Only insert if not already solved (avoid unique-index conflicts on retries).
  if v_is_correct and v_already then
    return query select true, true, v_points;
    return;
  end if;

  insert into submissions (team_id, challenge_id, user_id, flag, is_correct)
  values (p_team_id, p_challenge_id, auth.uid(), p_flag, v_is_correct);

  return query select v_is_correct, false, v_points;
end;
$$;

grant execute on function submit_flag(uuid, uuid, text) to authenticated;

-- =====================================================================
-- find_event_by_invite: look up an event by invite code (for join flow).
-- =====================================================================
create or replace function find_event_by_invite(p_code text)
returns table (id uuid, name text, description text)
language sql
security definer
set search_path = public
as $$
  select id, name, description
  from events
  where invite_code = p_code and is_active = true
  limit 1;
$$;

grant execute on function find_event_by_invite(text) to authenticated;

-- =====================================================================
-- find_team_by_invite: look up a team by invite code (for join flow).
-- =====================================================================
create or replace function find_team_by_invite(p_code text)
returns table (id uuid, event_id uuid, name text)
language sql
security definer
set search_path = public
as $$
  select id, event_id, name
  from teams
  where invite_code = p_code
  limit 1;
$$;

grant execute on function find_team_by_invite(text) to authenticated;
