-- submit_flag's RETURN signature includes `is_correct boolean` as an OUT
-- parameter, which becomes a variable in the function body and conflicts
-- with `submissions.is_correct` in the EXISTS subquery. Qualifying via an
-- alias removes the ambiguity.

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
    v_expected := v_chal.flag;
  else
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
      and sm.is_correct   = true                  -- qualified → no conflict
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
