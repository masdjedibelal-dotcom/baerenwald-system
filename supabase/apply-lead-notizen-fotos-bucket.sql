-- Im Supabase Dashboard → SQL Editor ausführen (einmalig).
-- Behebt: „Bucket not found“ bei Notiz- und Projekt-Angebots-Fotos.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lead-notizen-fotos',
  'lead-notizen-fotos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "lead_notiz_fotos_public_read" on storage.objects;
create policy "lead_notiz_fotos_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'lead-notizen-fotos');
