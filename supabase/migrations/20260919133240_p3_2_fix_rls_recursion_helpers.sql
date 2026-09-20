-- P3-2: RLS-Rekursion absichern (CRM-Reads ohne withCrmReadFallback)
--
-- Ursache (historisch / Restlücken):
--   Portal-Policies auf angebote ↔ leads ↔ kunden ↔ auftraege / auftrag_positionen
--   lasen sich gegenseitig per EXISTS/JOIN unter RLS →
--   „infinite recursion detected in policy for relation …“.
--
-- Kanonische Lösung (bereits teilweise deployed):
--   SECURITY DEFINER + SET row_security = off Hilfsfunktionen liefern ID-Mengen;
--   Policies prüfen nur noch id IN (SELECT helper()).
--
-- Diese Migration ist idempotent und schließt Restlücken:
--   1) Alle Kern-Helpers erneut mit row_security=off
--   2) portal_org_can_write ebenfalls row_security=off
--   3) lead_befunde*-Policies ohne direkten leads-Join (via portal_kunde_lead_ids)
--   4) get_kunde_id_by_portal_token: portal_token-Spalte ist weg → no-op NULL

-- ---------------------------------------------------------------------------
-- 1) Kern-Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_crm_staff()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.user_profiles where id = auth.uid()
  );
$$;

create or replace function public.portal_kunde_id()
returns uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select id from public.kunden where auth_user_id = auth.uid() limit 1;
$$;

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

create or replace function public.portal_handwerker_id()
returns uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select id from public.handwerker where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.is_portal_handwerker()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.portal_handwerker_id() is not null
    and not public.is_crm_staff();
$$;

create or replace function public.portal_handwerker_angebot_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select ah.angebot_id
  from public.angebot_handwerker ah
  where ah.handwerker_id = public.portal_handwerker_id();
$$;

create or replace function public.portal_handwerker_lead_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select distinct a.lead_id
  from public.angebote a
  inner join public.angebot_handwerker ah on ah.angebot_id = a.id
  where ah.handwerker_id = public.portal_handwerker_id()
    and a.lead_id is not null;
$$;

create or replace function public.portal_handwerker_kunde_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select distinct a.kunde_id
  from public.angebote a
  inner join public.angebot_handwerker ah on ah.angebot_id = a.id
  where ah.handwerker_id = public.portal_handwerker_id()
    and a.kunde_id is not null;
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

create or replace function public.portal_org_can_write()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(public.portal_org_mitglied_rolle(), 'admin')
    in ('admin', 'sachbearbeiter');
$$;

revoke all on function public.is_crm_staff() from public;
revoke all on function public.portal_kunde_id() from public;
revoke all on function public.portal_kunde_lead_ids() from public;
revoke all on function public.portal_kunde_auftrag_ids() from public;
revoke all on function public.portal_handwerker_id() from public;
revoke all on function public.is_portal_handwerker() from public;
revoke all on function public.portal_handwerker_angebot_ids() from public;
revoke all on function public.portal_handwerker_lead_ids() from public;
revoke all on function public.portal_handwerker_kunde_ids() from public;
revoke all on function public.portal_handwerker_auftrag_ids() from public;
revoke all on function public.portal_org_can_write() from public;

grant execute on function public.is_crm_staff() to authenticated, service_role;
grant execute on function public.portal_kunde_id() to authenticated, service_role;
grant execute on function public.portal_kunde_lead_ids() to authenticated, service_role;
grant execute on function public.portal_kunde_auftrag_ids() to authenticated, service_role;
grant execute on function public.portal_handwerker_id() to authenticated, service_role;
grant execute on function public.is_portal_handwerker() to authenticated, service_role;
grant execute on function public.portal_handwerker_angebot_ids() to authenticated, service_role;
grant execute on function public.portal_handwerker_lead_ids() to authenticated, service_role;
grant execute on function public.portal_handwerker_kunde_ids() to authenticated, service_role;
grant execute on function public.portal_handwerker_auftrag_ids() to authenticated, service_role;
grant execute on function public.portal_org_can_write() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Partner-/Kunden-Portal Policies (Helper-basiert)
-- ---------------------------------------------------------------------------
drop policy if exists "angebote_portal_handwerker_select" on public.angebote;
create policy "angebote_portal_handwerker_select"
  on public.angebote for select to authenticated
  using (
    public.is_portal_handwerker()
    and id in (select public.portal_handwerker_angebot_ids())
  );

drop policy if exists "leads_portal_handwerker_select" on public.leads;
create policy "leads_portal_handwerker_select"
  on public.leads for select to authenticated
  using (
    public.is_portal_handwerker()
    and id in (select public.portal_handwerker_lead_ids())
  );

drop policy if exists "kunden_portal_handwerker_select" on public.kunden;
create policy "kunden_portal_handwerker_select"
  on public.kunden for select to authenticated
  using (
    public.is_portal_handwerker()
    and id in (select public.portal_handwerker_kunde_ids())
  );

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

-- ---------------------------------------------------------------------------
-- 3) lead_befunde: kein direkter leads-Join unter RLS
-- ---------------------------------------------------------------------------
drop policy if exists "lead_befunde_org_select" on public.lead_befunde;
create policy "lead_befunde_org_select"
  on public.lead_befunde for select to authenticated
  using (
    lead_id in (select public.portal_kunde_lead_ids())
  );

drop policy if exists "lead_befunde_org_write" on public.lead_befunde;
create policy "lead_befunde_org_write"
  on public.lead_befunde for all to authenticated
  using (
    public.portal_org_can_write()
    and lead_id in (select public.portal_kunde_lead_ids())
  )
  with check (
    public.portal_org_can_write()
    and lead_id in (select public.portal_kunde_lead_ids())
  );

drop policy if exists "lead_befund_punkte_org_select" on public.lead_befund_punkte;
create policy "lead_befund_punkte_org_select"
  on public.lead_befund_punkte for select to authenticated
  using (
    exists (
      select 1
      from public.lead_befunde b
      where b.id = lead_befund_punkte.befund_id
        and b.lead_id in (select public.portal_kunde_lead_ids())
    )
  );

drop policy if exists "lead_befund_punkte_org_write" on public.lead_befund_punkte;
create policy "lead_befund_punkte_org_write"
  on public.lead_befund_punkte for all to authenticated
  using (
    public.portal_org_can_write()
    and exists (
      select 1
      from public.lead_befunde b
      where b.id = lead_befund_punkte.befund_id
        and b.lead_id in (select public.portal_kunde_lead_ids())
    )
  )
  with check (
    public.portal_org_can_write()
    and exists (
      select 1
      from public.lead_befunde b
      where b.id = lead_befund_punkte.befund_id
        and b.lead_id in (select public.portal_kunde_lead_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- 4) Legacy portal_token RPC (Spalte existiert nicht mehr)
-- ---------------------------------------------------------------------------
create or replace function public.get_kunde_id_by_portal_token(token text)
returns uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select null::uuid;
$$;
