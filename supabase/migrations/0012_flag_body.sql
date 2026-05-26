-- Switch static challenges to store just the FLAG BODY (no prefix, no braces).
-- The event's flag_prefix is wrapped on at submit time, so a single library
-- challenge can be used by events with different prefixes.

-- 1) Strip "PREFIX{...}" wrappers from existing flag values.
--    Only touches rows that match the pattern; flags that don't follow the
--    "prefix{body}" convention are left alone for the admin to clean up.
update challenges
set flag = regexp_replace(flag, '^[A-Za-z0-9_-]+\{(.*)\}$', '\1')
where flag ~ '^[A-Za-z0-9_-]+\{.+\}$';

-- 2) Rewrite submit_flag: static challenges now wrap the body with the
--    event's flag_prefix before comparing.
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
  v_prefix      text;
  v_is_correct  boolean := false;
  v_already     boolean;
  v_expected    text;
begin
  if not exists (
    select 1 from team_members tm
    where tm.team_id = p_team_id and tm.user_id = auth.uid()
  ) then
    raise exception 'not a member of this team';
  end if;

  select t.event_id into v_event_id from teams t where t.id = p_team_id;

  if not exists (
    select 1 from event_challenges ec
    where ec.event_id = v_event_id and ec.challenge_id = p_challenge_id
  ) then
    raise exception 'challenge is not part of this event';
  end if;

  select * into v_chal from challenges c where c.id = p_challenge_id;

  if v_chal.type = 'static' then
    select e.flag_prefix into v_prefix from events e where e.id = v_event_id;
    v_expected := v_prefix || '{' || v_chal.flag || '}';
  else
    -- dynamic: instances.flag was generated WITH the event prefix already
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
    select 1 from submissions sm
    where sm.team_id      = p_team_id
      and sm.challenge_id = p_challenge_id
      and sm.is_correct   = true
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
