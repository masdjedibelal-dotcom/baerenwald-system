-- Portal-Dokumente: Sichtbarkeit HV / Kunde / Mieter / Bautagebuch / Rechnungen
-- Spec: docs/PORTAL_DOKUMENTE_HANDOFF.md

-- 1) Rechnung bleibt nach Zahlung im Kundenportal (gesendet ODER bezahlt)
drop policy if exists "rechnungen_portal_select" on public.rechnungen;
create policy "rechnungen_portal_select"
  on public.rechnungen for select to authenticated
  using (
    not public.is_crm_staff()
    and status in ('gesendet', 'bezahlt')
    and auftrag_id in (
      select a.id from public.auftraege a
      where a.kunde_id = public.portal_kunde_id()
         or a.lead_id in (select public.portal_kunde_lead_ids())
    )
  );

-- 2) Lead-IDs für Portal: eigener Kunde (Mieter) ODER Auftraggeber (HV)
create or replace function public.portal_kunde_lead_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select l.id
  from public.leads l
  where l.kunde_id = public.portal_kunde_id()
     or l.auftraggeber_kunde_id = public.portal_kunde_id();
$$;

-- 3) Bautagebuch: Kundenportal darf freigegebene Einträge lesen
drop policy if exists "auftrag_bautagebuch_kunde_portal_select" on public.auftrag_bautagebuch_eintraege;
create policy "auftrag_bautagebuch_kunde_portal_select"
  on public.auftrag_bautagebuch_eintraege for select to authenticated
  using (
    not public.is_crm_staff()
    and not public.is_portal_handwerker()
    and fuer_kunde_freigegeben = true
    and auftrag_id in (
      select a.id from public.auftraege a
      where a.kunde_id = public.portal_kunde_id()
         or a.lead_id in (select public.portal_kunde_lead_ids())
    )
  );

-- 4) kunden_dokumente: nicht mehr alle authenticated — CRM + eigene Portal-Unterlagen
drop policy if exists "kunden_dokumente_auth_all" on public.kunden_dokumente;

drop policy if exists "kunden_dokumente_crm_staff_all" on public.kunden_dokumente;
create policy "kunden_dokumente_crm_staff_all"
  on public.kunden_dokumente for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "kunden_dokumente_portal_select" on public.kunden_dokumente;
create policy "kunden_dokumente_portal_select"
  on public.kunden_dokumente for select to authenticated
  using (
    not public.is_crm_staff()
    and kunde_id = public.portal_kunde_id()
  );

-- 5) Backfill: Timeline sichtbar_fuer_kunde ohne Portal-Flag
update public.auftrag_timeline
set
  fuer_kunde_freigegeben = true,
  freigegeben_at = coalesce(freigegeben_at, created_at, now())
where sichtbar_fuer_kunde = true
  and coalesce(fuer_kunde_freigegeben, false) = false;
