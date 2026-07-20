-- KI Hub: Storage-Bucket für generierte Marketing-Bilder

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ki-content',
  'ki-content',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "ki_content_public_read" on storage.objects;
create policy "ki_content_public_read"
  on storage.objects for select
  using (bucket_id = 'ki-content');

drop policy if exists "ki_content_service_upload" on storage.objects;
create policy "ki_content_service_upload"
  on storage.objects for insert
  with check (bucket_id = 'ki-content');
