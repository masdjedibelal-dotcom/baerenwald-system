-- Storage-Policies für Bucket handwerker-uploads (PRIVATE)
-- Voraussetzung: Bucket im Dashboard anlegen + Migration portal_auth_handwerker.sql
--
-- Ordnerstruktur:
--   {handwerker_id}/angebote/{anfrage_id}/angebot-*.pdf
--   {handwerker_id}/bautagebuch/{auftrag_id}/*.{jpg,png,webp}

-- Partner: nur eigener Ordner (erstes Pfadsegment = portal_handwerker_id)
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

-- CRM-Mitarbeiter: Vollzugriff auf den Bucket
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
