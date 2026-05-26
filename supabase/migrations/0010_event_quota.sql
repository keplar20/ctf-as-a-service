-- Per-organizer quota on how many events they can have active at once.
-- Defaults to 0; admin grants more via /admin/users.

alter table profiles
  add column if not exists event_quota integer not null default 0
  check (event_quota >= 0);

-- Backfill: keep current organizers from being stuck with 0
-- (they already have events). Bump them to max(current_count, 1).
update profiles p
set event_quota = greatest(
  (select count(*) from events e where e.organizer_id = p.id),
  1
)
where p.role = 'organizer' and p.event_quota = 0;

-- =====================================================================
-- Defense in depth: prevent a user from updating their own role or quota
-- via the existing profiles_self_update policy.
-- =====================================================================
create or replace function profiles_protect_privileged_cols()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role <> old.role or new.event_quota <> old.event_quota)
     and not is_admin() then
    raise exception 'only admins can change role or event_quota';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged_cols_trg on profiles;
create trigger profiles_protect_privileged_cols_trg
  before update on profiles
  for each row execute function profiles_protect_privileged_cols();
