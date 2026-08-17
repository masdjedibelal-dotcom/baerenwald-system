-- Extra-Buckets, die der Code erwartet, aber nicht in storage-buckets-crm-setup.sql stehen.
-- Nur auf Staging anwenden (Guard im Shell-Skript). Idempotent.

-- handwerker-uploads (Policies kommen aus storage-buckets-crm-setup.sql)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'handwerker-uploads',
  'handwerker-uploads',
  false,
  15728640,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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
  on storage.objects for select to public
  using (bucket_id = 'angebote-pdfs');

drop policy if exists "angebote_pdfs_authenticated_insert" on storage.objects;
create policy "angebote_pdfs_authenticated_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'angebote-pdfs');

drop policy if exists "angebote_pdfs_authenticated_update" on storage.objects;
create policy "angebote_pdfs_authenticated_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'angebote-pdfs');

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
  on storage.objects for select to public
  using (bucket_id = 'lead-notizen-fotos');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lead-dokumente',
  'lead-dokumente',
  true,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "lead_dokumente_public_read" on storage.objects;
create policy "lead_dokumente_public_read"
  on storage.objects for select to public
  using (bucket_id = 'lead-dokumente');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kunden-dokumente',
  'kunden-dokumente',
  true,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "kunden_dokumente_public_read" on storage.objects;
create policy "kunden_dokumente_public_read"
  on storage.objects for select to public
  using (bucket_id = 'kunden-dokumente');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'visualisierungen',
  'visualisierungen',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "visualisierungen_public_read" on storage.objects;
create policy "visualisierungen_public_read"
  on storage.objects for select to public
  using (bucket_id = 'visualisierungen');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ki-content',
  'ki-content',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ki_content_public_read" on storage.objects;
create policy "ki_content_public_read"
  on storage.objects for select
  using (bucket_id = 'ki-content');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vertraege-pdfs',
  'vertraege-pdfs',
  true,
  15728640,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "vertraege_pdfs_public_read" on storage.objects;
create policy "vertraege_pdfs_public_read"
  on storage.objects for select to public
  using (bucket_id = 'vertraege-pdfs');

drop policy if exists "vertraege_pdfs_authenticated_insert" on storage.objects;
create policy "vertraege_pdfs_authenticated_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'vertraege-pdfs');

drop policy if exists "vertraege_pdfs_authenticated_update" on storage.objects;
create policy "vertraege_pdfs_authenticated_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'vertraege-pdfs');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gpt-visualisierungen',
  'gpt-visualisierungen',
  true,
  12582912,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "gpt_visualisierungen_public_read" on storage.objects;
create policy "gpt_visualisierungen_public_read"
  on storage.objects for select to public
  using (bucket_id = 'gpt-visualisierungen');

drop policy if exists "gpt_visualisierungen_service_write" on storage.objects;
create policy "gpt_visualisierungen_service_write"
  on storage.objects for all to service_role
  using (bucket_id = 'gpt-visualisierungen')
  with check (bucket_id = 'gpt-visualisierungen');

select id, name, public, file_size_limit
from storage.buckets
where id in (
  'rechnungen-pdfs',
  'protokolle',
  'partner-dokumente',
  'hw-formular-fotos',
  'logos',
  'eingangsrechnungen',
  'buergschaften',
  'handwerker-uploads',
  'angebote-pdfs',
  'lead-notizen-fotos',
  'lead-dokumente',
  'kunden-dokumente',
  'visualisierungen',
  'ki-content',
  'vertraege-pdfs',
  'gpt-visualisierungen'
)
order by id;
