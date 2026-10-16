-- Partner-Mitarbeiter im Portal (16.10.2026): eigener, eng begrenzter Zugriff.
-- Ein Mitarbeiter darf nur in den Ordner seines eigenen, angenommenen Einsatzes hochladen
-- (Updates und Fertigmeldung) — nichts sonst vom Partner.

create or replace function public.portal_mitarbeiter_id()
returns uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select id from public.handwerker_mitarbeiter where auth_user_id = auth.uid() and aktiv limit 1;
$$;
revoke all on function public.portal_mitarbeiter_id() from public;
grant execute on function public.portal_mitarbeiter_id() to authenticated, service_role;

drop policy if exists "handwerker_uploads_mitarbeiter_insert" on storage.objects;
create policy "handwerker_uploads_mitarbeiter_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'handwerker-uploads'
    and public.portal_mitarbeiter_id() is not null
    and (storage.foldername(name))[2] = 'einsatz'
    and (storage.foldername(name))[4] in ('mitteilung', 'fertig')
    and exists (
      select 1 from public.einsaetze e
      where e.id::text = (storage.foldername(name))[3]
        and e.handwerker_id::text = (storage.foldername(name))[1]
        and e.mitarbeiter_id = public.portal_mitarbeiter_id()
        and e.status = 'angenommen'
    )
  );
