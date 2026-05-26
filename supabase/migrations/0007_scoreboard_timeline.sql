-- Per-team cumulative score over time. Used to draw the scoreboard chart.
-- View runs as its owner (postgres, has BYPASSRLS), so participants can see
-- all teams' progress in their event — same trust model as the existing
-- `scoreboard` view.

create or replace view scoreboard_timeline as
select
  t.event_id,
  t.id            as team_id,
  t.name          as team_name,
  s.submitted_at,
  c.points,
  sum(c.points) over (
    partition by t.id
    order by s.submitted_at
    rows between unbounded preceding and current row
  )::int          as cumulative_points
from teams t
join submissions s on s.team_id = t.id and s.is_correct = true
join challenges  c on c.id = s.challenge_id;

grant select on scoreboard_timeline to authenticated;
