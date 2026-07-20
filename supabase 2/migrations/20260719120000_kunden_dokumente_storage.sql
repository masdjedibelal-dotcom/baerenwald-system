-- Storage-Bucket für Kunden-Dokumente (CRM)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kunden-dokumente',
  'kunden-dokumente',
  true,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "kunden_dokumente_public_read" on storage.objects;
create policy "kunden_dokumente_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'kunden-dokumente');
