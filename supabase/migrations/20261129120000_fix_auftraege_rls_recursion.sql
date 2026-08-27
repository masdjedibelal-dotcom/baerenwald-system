-- Behebt: infinite recursion detected in policy for relation "auftraege"
-- Ursache: auftraege_portal_handwerker_select liest auftrag_positionen,
--          auftrag_positionen_portal_select liest wieder auftraege.
-- Lösung: security-definer-Helpers mit row_security = off (wie leads-Fix).

create or replace function public.portal_kunde_lead_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select l.id
  from public.leads l
  where l.kunde_id = public.portal_kunde_id()
     or l.auftraggeber_kunde_id = public.portal_kunde_id();
$$;

create or replace function public.portal_kunde_auftrag_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select a.id
  from public.auftraege a
  where a.kunde_id = public.portal_kunde_id()
     or a.lead_id in (select public.portal_kunde_lead_ids());
$$;

create or replace function public.portal_handwerker_auftrag_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select ah.auftrag_id
  from public.auftrag_handwerker ah
  where ah.handwerker_id = public.portal_handwerker_id()
    and lower(coalesce(ah.status, '')) not in ('ersetzt', 'abgelehnt')
  union
  select ap.auftrag_id
  from public.auftrag_positionen ap
  where ap.handwerker_id = public.portal_handwerker_id();
$$;

revoke all on function public.portal_kunde_auftrag_ids() from public;
revoke all on function public.portal_handwerker_auftrag_ids() from public;
grant execute on function public.portal_kunde_lead_ids() to authenticated, service_role;
grant execute on function public.portal_kunde_auftrag_ids() to authenticated, service_role;
grant execute on function public.portal_handwerker_auftrag_ids() to authenticated, service_role;

drop policy if exists "auftraege_portal_handwerker_select" on public.auftraege;
create policy "auftraege_portal_handwerker_select"
  on public.auftraege for select to authenticated
  using (
    public.is_portal_handwerker()
    and id in (select public.portal_handwerker_auftrag_ids())
  );

drop policy if exists "auftrag_positionen_portal_select" on public.auftrag_positionen;
create policy "auftrag_positionen_portal_select"
  on public.auftrag_positionen for select to authenticated
  using (
    fuer_kunde_sichtbar = true
    and auftrag_id in (select public.portal_kunde_auftrag_ids())
  );

drop policy if exists "auftrag_timeline_portal_select" on public.auftrag_timeline;
create policy "auftrag_timeline_portal_select"
  on public.auftrag_timeline for select to authenticated
  using (
    fuer_kunde_freigegeben = true
    and auftrag_id in (select public.portal_kunde_auftrag_ids())
  );

drop policy if exists "bautagebuch_portal_select" on public.bautagebuch;
create policy "bautagebuch_portal_select"
  on public.bautagebuch for select to authenticated
  using (
    not public.is_crm_staff()
    and fuer_kunde_sichtbar = true
    and auftrag_id in (select public.portal_kunde_auftrag_ids())
  );

drop policy if exists "rechnungen_portal_select" on public.rechnungen;
create policy "rechnungen_portal_select"
  on public.rechnungen for select to authenticated
  using (
    not public.is_crm_staff()
    and status in ('gesendet', 'bezahlt')
    and auftrag_id in (select public.portal_kunde_auftrag_ids())
  );

drop policy if exists "auftrag_bautagebuch_kunde_portal_select" on public.auftrag_bautagebuch_eintraege;
create policy "auftrag_bautagebuch_kunde_portal_select"
  on public.auftrag_bautagebuch_eintraege for select to authenticated
  using (
    not public.is_crm_staff()
    and not public.is_portal_handwerker()
    and fuer_kunde_freigegeben = true
    and auftrag_id in (select public.portal_kunde_auftrag_ids())
  );

-- Partner-Bautagebuch: gleiche Auftrag-IDs ohne RLS-Kreuzung
drop policy if exists "auftrag_bautagebuch_portal_select" on public.auftrag_bautagebuch_eintraege;
create policy "auftrag_bautagebuch_portal_select"
  on public.auftrag_bautagebuch_eintraege for select to authenticated
  using (
    public.is_portal_handwerker()
    and (
      handwerker_id = public.portal_handwerker_id()
      or auftrag_id in (select public.portal_handwerker_auftrag_ids())
    )
  );
