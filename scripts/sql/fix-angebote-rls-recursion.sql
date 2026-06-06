-- =============================================================================
-- EINMAL IM SUPABASE SQL EDITOR AUSFÜHREN
-- Behebt:
--   • column "portal_token" does not exist (alte kunden-RLS)
--   • infinite recursion detected in policy for relation "leads" / "angebote"
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Alte Policies mit portal_token (alle Tabellen in public)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  qual_text text;
  check_text text;
begin
  for r in
    select p.polname as policy_name,
           n.nspname as schema_name,
           c.relname as table_name,
           p.polrelid as relid,
           p.polqual,
           p.polwithcheck
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
  loop
    qual_text := coalesce(pg_get_expr(r.polqual, r.relid), '');
    check_text := coalesce(pg_get_expr(r.polwithcheck, r.relid), '');

    if qual_text ilike '%portal_token%'
       or check_text ilike '%portal_token%'
       or r.policy_name ilike '%portal_token%'
       or r.policy_name ilike 'portal_kunden%'
    then
      execute format(
        'drop policy if exists %I on %I.%I',
        r.policy_name,
        r.schema_name,
        r.table_name
      );
      raise notice 'Dropped policy % on %.%', r.policy_name, r.schema_name, r.table_name;
    end if;
  end loop;
end $$;

drop policy if exists "portal_kunden" on public.kunden;
alter table public.kunden drop column if exists portal_token;
alter table public.kunden add column if not exists auth_user_id uuid;

-- ---------------------------------------------------------------------------
-- 2) Hilfsfunktionen: lesen ohne RLS-Rekursion (security definer + row_security off)
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
  where l.kunde_id = public.portal_kunde_id();
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
  union
  select ap.auftrag_id
  from public.auftrag_positionen ap
  where ap.handwerker_id = public.portal_handwerker_id();
$$;

revoke all on function public.portal_handwerker_angebot_ids() from public;
revoke all on function public.portal_handwerker_lead_ids() from public;
revoke all on function public.portal_handwerker_kunde_ids() from public;
revoke all on function public.portal_handwerker_auftrag_ids() from public;
grant execute on function public.portal_handwerker_angebot_ids() to authenticated, service_role;
grant execute on function public.portal_handwerker_lead_ids() to authenticated, service_role;
grant execute on function public.portal_handwerker_kunde_ids() to authenticated, service_role;
grant execute on function public.portal_handwerker_auftrag_ids() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) kunden — CRM + Portal (ohne portal_token)
-- ---------------------------------------------------------------------------
drop policy if exists "kunden_crm_staff_all" on public.kunden;
create policy "kunden_crm_staff_all"
  on public.kunden for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "kunden_portal_select_own" on public.kunden;
create policy "kunden_portal_select_own"
  on public.kunden for select to authenticated
  using (auth_user_id = auth.uid() and not public.is_crm_staff());

drop policy if exists "kunden_portal_update_own" on public.kunden;
create policy "kunden_portal_update_own"
  on public.kunden for update to authenticated
  using (auth_user_id = auth.uid() and not public.is_crm_staff())
  with check (auth_user_id = auth.uid() and not public.is_crm_staff());

-- ---------------------------------------------------------------------------
-- 4) Partner-Portal-Policies (ohne verschachtelte Subqueries)
-- ---------------------------------------------------------------------------
-- angebote
drop policy if exists "angebote_portal_handwerker_select" on public.angebote;
create policy "angebote_portal_handwerker_select"
  on public.angebote for select to authenticated
  using (
    public.is_portal_handwerker()
    and id in (select public.portal_handwerker_angebot_ids())
  );

-- leads
drop policy if exists "leads_portal_handwerker_select" on public.leads;
create policy "leads_portal_handwerker_select"
  on public.leads for select to authenticated
  using (
    public.is_portal_handwerker()
    and id in (select public.portal_handwerker_lead_ids())
  );

-- kunden (wichtig für CRM-Joins: rechnungen → kunden)
drop policy if exists "kunden_portal_handwerker_select" on public.kunden;
create policy "kunden_portal_handwerker_select"
  on public.kunden for select to authenticated
  using (
    public.is_portal_handwerker()
    and id in (select public.portal_handwerker_kunde_ids())
  );

-- auftraege + bautagebuch
drop policy if exists "auftraege_portal_handwerker_select" on public.auftraege;
create policy "auftraege_portal_handwerker_select"
  on public.auftraege for select to authenticated
  using (
    public.is_portal_handwerker()
    and id in (select public.portal_handwerker_auftrag_ids())
  );

drop policy if exists "auftrag_bautagebuch_portal_select" on public.auftrag_bautagebuch_eintraege;
create policy "auftrag_bautagebuch_portal_select"
  on public.auftrag_bautagebuch_eintraege for select to authenticated
  using (
    public.is_portal_handwerker()
    and auftrag_id in (select public.portal_handwerker_auftrag_ids())
  );

drop policy if exists "auftrag_bautagebuch_portal_insert" on public.auftrag_bautagebuch_eintraege;
create policy "auftrag_bautagebuch_portal_insert"
  on public.auftrag_bautagebuch_eintraege for insert to authenticated
  with check (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
    and auftrag_id in (select public.portal_handwerker_auftrag_ids())
  );

-- CRM: voller Zugriff auf Auftragspositionen (Detail lädt per Service Role; ohne Policy schlägt Zuweisung fehl)
drop policy if exists "auftrag_positionen_crm_staff_all" on public.auftrag_positionen;
create policy "auftrag_positionen_crm_staff_all"
  on public.auftrag_positionen for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

-- Prüfung: angebote-Policy sollte portal_handwerker_angebot_ids() enthalten
select policyname, qual::text
from pg_policies
where schemaname = 'public'
  and tablename = 'angebote'
order by policyname;
