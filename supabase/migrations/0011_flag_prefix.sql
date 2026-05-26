-- Per-event flag prefix used when generating dynamic-challenge flags.
-- Static challenges keep whatever the admin typed when creating them.

alter table events
  add column if not exists flag_prefix text not null default 'ctf';

-- Sanitize: 1-32 chars, alnum/_/- only. Keeps the rendered flag clean.
alter table events
  add constraint events_flag_prefix_chk
  check (flag_prefix ~ '^[A-Za-z0-9_-]{1,32}$')
  not valid;

alter table events validate constraint events_flag_prefix_chk;
