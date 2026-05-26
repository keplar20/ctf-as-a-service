-- Replace scoreboard_timeline with a CTE-based version that isolates the
-- is_correct filter to a scope where only `submissions` is in play, so the
-- column reference can't be ambiguous under any query plan / PostgREST rewrite.

drop view if exists scoreboard_timeline cascade;

create view scoreboard_timeline as
with correct_solves as (
  select
    s.team_id      as team_id,
    s.submitted_at as submitted_at,
    c.points       as points
  from submissions s
  join challenges  c on c.id = s.challenge_id
  where s.is_correct = true
)
select
  t.event_id,
  t.id   as team_id,
  t.name as team_name,
  cs.submitted_at,
  cs.points,
  sum(cs.points) over (
    partition by t.id
    order by cs.submitted_at
    rows between unbounded preceding and current row
  )::int as cumulative_points
from teams t
join correct_solves cs on cs.team_id = t.id;

grant select on scoreboard_timeline to authenticated;
