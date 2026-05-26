-- Storage bucket for challenge attachments.
-- Run after the schema is in place.

insert into storage.buckets (id, name, public)
values ('challenge-files', 'challenge-files', true)
on conflict (id) do nothing;

-- Anyone signed-in can read; only admins can write.
create policy "challenge files: public read"
on storage.objects for select
using (bucket_id = 'challenge-files');

create policy "challenge files: admin write"
on storage.objects for insert
with check (
  bucket_id = 'challenge-files'
  and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

create policy "challenge files: admin update"
on storage.objects for update
using (
  bucket_id = 'challenge-files'
  and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

create policy "challenge files: admin delete"
on storage.objects for delete
using (
  bucket_id = 'challenge-files'
  and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
