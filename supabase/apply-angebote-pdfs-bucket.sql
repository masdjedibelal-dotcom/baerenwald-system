-- Im Supabase Dashboard → SQL Editor ausführen (einmalig).
-- Behebt: „Bucket not found“ beim Angebots-Versand / PDF-Speicherung.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'angebote-pdfs',
  'angebote-pdfs',
  true,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "angebote_pdfs_public_read" on storage.objects;
create policy "angebote_pdfs_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'angebote-pdfs');

-- Optional: Upload aus dem CRM (eingeloggte Nutzer) — Service-Role umgeht RLS ohnehin
drop policy if exists "angebote_pdfs_authenticated_insert" on storage.objects;
create policy "angebote_pdfs_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'angebote-pdfs');

drop policy if exists "angebote_pdfs_authenticated_update" on storage.objects;
create policy "angebote_pdfs_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'angebote-pdfs');
