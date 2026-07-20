-- =============================================================================
-- CRM Storage: fehlende Buckets + Policies (Supabase SQL Editor)
-- =============================================================================
-- Legt nur die Bucket-IDs an, die der Code erwartet. Bestehende Buckets
-- (z. B. „generierte PDFs“, „Abnahmeprotokolle“, „Eingangsrechnungen“ mit
-- Großschreibung) werden NICHT gelöscht — der Code nutzt sie nicht.
--
-- Bereits vorhanden lassen: angebote-pdfs, lead-notizen-fotos, handwerker-uploads
--
-- Nach dem Lauf: Storage → Buckets prüfen auf:
--   rechnungen-pdfs, protokolle, partner-dokumente, hw-formular-fotos, logos,
--   eingangsrechnungen, buergschaften
-- =============================================================================

-- ─── 1) Rechnungs-PDFs (persistPdfForRechnung) ─────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rechnungen-pdfs',
  'rechnungen-pdfs',
  true,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "rechnungen_pdfs_public_read" on storage.objects;
create policy "rechnungen_pdfs_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'rechnungen-pdfs');

drop policy if exists "rechnungen_pdfs_authenticated_insert" on storage.objects;
create policy "rechnungen_pdfs_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'rechnungen-pdfs');

drop policy if exists "rechnungen_pdfs_authenticated_update" on storage.objects;
create policy "rechnungen_pdfs_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'rechnungen-pdfs');

-- ─── 2) Protokolle: Abnahme-PDF, Bautagebuch-/Timeline-Fotos, Vor-Baubeginn ─
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'protokolle',
  'protokolle',
  true,
  15728640,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "protokolle_public_read" on storage.objects;
create policy "protokolle_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'protokolle');

drop policy if exists "protokolle_authenticated_insert" on storage.objects;
create policy "protokolle_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'protokolle');

drop policy if exists "protokolle_authenticated_update" on storage.objects;
create policy "protokolle_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'protokolle');

drop policy if exists "protokolle_authenticated_delete" on storage.objects;
create policy "protokolle_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'protokolle');

-- ─── 3) Partner-Compliance (Handwerker-Dokumente, privat) ────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'partner-dokumente',
  'partner-dokumente',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "partner_dokumente_objects_read" on storage.objects;
create policy "partner_dokumente_objects_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'partner-dokumente');

drop policy if exists "partner_dokumente_objects_insert" on storage.objects;
create policy "partner_dokumente_objects_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'partner-dokumente');

drop policy if exists "partner_dokumente_objects_update" on storage.objects;
create policy "partner_dokumente_objects_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'partner-dokumente');

drop policy if exists "partner_dokumente_objects_delete" on storage.objects;
create policy "partner_dokumente_objects_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'partner-dokumente');

-- ─── 4) HW-Formular-Fotos (öffentlich lesbar) ───────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hw-formular-fotos',
  'hw-formular-fotos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "hw_formular_fotos_public_read" on storage.objects;
create policy "hw_formular_fotos_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'hw-formular-fotos');

drop policy if exists "hw_formular_fotos_authenticated_insert" on storage.objects;
create policy "hw_formular_fotos_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'hw-formular-fotos');

-- ─── 5) Logos (Einstellungen) ───────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "logos_public_read" on storage.objects;
create policy "logos_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'logos');

drop policy if exists "logos_authenticated_insert" on storage.objects;
create policy "logos_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'logos');

drop policy if exists "logos_authenticated_update" on storage.objects;
create policy "logos_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'logos');

drop policy if exists "logos_authenticated_delete" on storage.objects;
create policy "logos_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'logos');

-- ─── 6) Eingangsrechnungen (Kleinbuchstaben — Code-ID!) ─────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'eingangsrechnungen',
  'eingangsrechnungen',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "eingangsrechnungen_objects_read" on storage.objects;
create policy "eingangsrechnungen_objects_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'eingangsrechnungen');

drop policy if exists "eingangsrechnungen_objects_insert" on storage.objects;
create policy "eingangsrechnungen_objects_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'eingangsrechnungen');

drop policy if exists "eingangsrechnungen_objects_update" on storage.objects;
create policy "eingangsrechnungen_objects_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'eingangsrechnungen');

drop policy if exists "eingangsrechnungen_objects_delete" on storage.objects;
create policy "eingangsrechnungen_objects_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'eingangsrechnungen');

-- ─── 7) Bürgschaften (Kleinbuchstaben — Code-ID!) ───────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'buergschaften',
  'buergschaften',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "buergschaften_objects_read" on storage.objects;
create policy "buergschaften_objects_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'buergschaften');

drop policy if exists "buergschaften_objects_insert" on storage.objects;
create policy "buergschaften_objects_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'buergschaften');

drop policy if exists "buergschaften_objects_update" on storage.objects;
create policy "buergschaften_objects_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'buergschaften');

drop policy if exists "buergschaften_objects_delete" on storage.objects;
create policy "buergschaften_objects_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'buergschaften');

-- ─── 8) handwerker-uploads: Policies (Bucket oft schon da, 0 Policies) ────────
-- Voraussetzung: Partner-SQL (portal_handwerker_id, is_portal_handwerker, is_crm_staff).
-- Fehler hier? Zuerst scripts/sql/partner-portal/01_portal_auth_handwerker.sql ausführen.

drop policy if exists "handwerker_uploads_portal_select" on storage.objects;
create policy "handwerker_uploads_portal_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'handwerker-uploads'
    and public.is_portal_handwerker()
    and (storage.foldername(name))[1] = public.portal_handwerker_id()::text
  );

drop policy if exists "handwerker_uploads_portal_insert" on storage.objects;
create policy "handwerker_uploads_portal_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'handwerker-uploads'
    and public.is_portal_handwerker()
    and (storage.foldername(name))[1] = public.portal_handwerker_id()::text
  );

drop policy if exists "handwerker_uploads_portal_update" on storage.objects;
create policy "handwerker_uploads_portal_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'handwerker-uploads'
    and public.is_portal_handwerker()
    and (storage.foldername(name))[1] = public.portal_handwerker_id()::text
  )
  with check (
    bucket_id = 'handwerker-uploads'
    and public.is_portal_handwerker()
    and (storage.foldername(name))[1] = public.portal_handwerker_id()::text
  );

drop policy if exists "handwerker_uploads_portal_delete" on storage.objects;
create policy "handwerker_uploads_portal_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'handwerker-uploads'
    and public.is_portal_handwerker()
    and (storage.foldername(name))[1] = public.portal_handwerker_id()::text
  );

drop policy if exists "handwerker_uploads_crm_staff_all" on storage.objects;
create policy "handwerker_uploads_crm_staff_all"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'handwerker-uploads'
    and public.is_crm_staff()
  )
  with check (
    bucket_id = 'handwerker-uploads'
    and public.is_crm_staff()
  );

-- ─── Prüfung ─────────────────────────────────────────────────────────────────
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
  'angebote-pdfs',
  'lead-notizen-fotos',
  'handwerker-uploads'
)
order by id;
