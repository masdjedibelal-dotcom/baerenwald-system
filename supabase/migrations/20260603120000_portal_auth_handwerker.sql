-- Partner-Portal: Handwerker-Login (auth_user_id) + RLS für Anfragen
-- Voraussetzung: is_crm_staff() aus portal_auth_kunden.sql

-- ---------------------------------------------------------------------------
-- 1) Handwerker ↔ Auth-User
-- ---------------------------------------------------------------------------
alter table public.handwerker
  add column if not exists auth_user_id uuid;

comment on column public.handwerker.auth_user_id is
  'Supabase Auth User des Partner-Portals (nicht CRM-Mitarbeiter).';

create unique index if not exists handwerker_auth_user_id_unique_idx
  on public.handwerker (auth_user_id)
  where auth_user_id is not null;

do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'handwerker_auth_user_id_fkey'
      and conrelid = 'public.handwerker'::regclass
  ) then
    alter table public.handwerker
      add constraint handwerker_auth_user_id_fkey
      foreign key (auth_user_id) references auth.users (id) on delete set null;
  end if;
end $migration$;

create index if not exists handwerker_auth_user_id_idx on public.handwerker (auth_user_id);

-- ---------------------------------------------------------------------------
-- 2) Hilfsfunktionen
-- ---------------------------------------------------------------------------
create or replace function public.portal_handwerker_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.handwerker where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.is_portal_handwerker()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.portal_handwerker_id() is not null
    and not public.is_crm_staff();
$$;

revoke all on function public.portal_handwerker_id() from public;
grant execute on function public.portal_handwerker_id() to authenticated, service_role;
grant execute on function public.is_portal_handwerker() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) handwerker — eigenes Profil lesen
-- ---------------------------------------------------------------------------
alter table public.handwerker enable row level security;

drop policy if exists "handwerker_crm_staff_all" on public.handwerker;
create policy "handwerker_crm_staff_all"
  on public.handwerker for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "handwerker_portal_select_own" on public.handwerker;
create policy "handwerker_portal_select_own"
  on public.handwerker for select to authenticated
  using (
    auth_user_id = auth.uid()
    and not public.is_crm_staff()
  );

drop policy if exists "handwerker_portal_update_own" on public.handwerker;
create policy "handwerker_portal_update_own"
  on public.handwerker for update to authenticated
  using (auth_user_id = auth.uid() and not public.is_crm_staff())
  with check (auth_user_id = auth.uid() and not public.is_crm_staff());

-- ---------------------------------------------------------------------------
-- 4) angebot_handwerker — Anfragen lesen & antworten
-- ---------------------------------------------------------------------------
alter table public.angebot_handwerker enable row level security;

drop policy if exists "angebot_handwerker_crm_staff_all" on public.angebot_handwerker;
create policy "angebot_handwerker_crm_staff_all"
  on public.angebot_handwerker for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "angebot_handwerker_portal_select" on public.angebot_handwerker;
create policy "angebot_handwerker_portal_select"
  on public.angebot_handwerker for select to authenticated
  using (
    not public.is_crm_staff()
    and handwerker_id = public.portal_handwerker_id()
  );

drop policy if exists "angebot_handwerker_portal_update" on public.angebot_handwerker;
create policy "angebot_handwerker_portal_update"
  on public.angebot_handwerker for update to authenticated
  using (
    not public.is_crm_staff()
    and handwerker_id = public.portal_handwerker_id()
  )
  with check (
    not public.is_crm_staff()
    and handwerker_id = public.portal_handwerker_id()
  );

-- ---------------------------------------------------------------------------
-- 5) angebote — nur lesen (für Positionen/PLZ), verknüpft über angebot_handwerker
-- ---------------------------------------------------------------------------
drop policy if exists "angebote_portal_handwerker_select" on public.angebote;
create policy "angebote_portal_handwerker_select"
  on public.angebote for select to authenticated
  using (
    public.is_portal_handwerker()
    and id in (
      select ah.angebot_id
      from public.angebot_handwerker ah
      where ah.handwerker_id = public.portal_handwerker_id()
    )
  );

-- leads — nur PLZ/Zeitraum für zugeordnete Angebote
alter table public.leads enable row level security;

drop policy if exists "leads_portal_handwerker_select" on public.leads;
create policy "leads_portal_handwerker_select"
  on public.leads for select to authenticated
  using (
    public.is_portal_handwerker()
    and id in (
      select a.lead_id
      from public.angebote a
      inner join public.angebot_handwerker ah on ah.angebot_id = a.id
      where ah.handwerker_id = public.portal_handwerker_id()
        and a.lead_id is not null
    )
  );

-- kunden — nur PLZ/Ort (kein Name) für Partner-Angebote
drop policy if exists "kunden_portal_handwerker_select" on public.kunden;
create policy "kunden_portal_handwerker_select"
  on public.kunden for select to authenticated
  using (
    public.is_portal_handwerker()
    and id in (
      select a.kunde_id
      from public.angebote a
      inner join public.angebot_handwerker ah on ah.angebot_id = a.id
      where ah.handwerker_id = public.portal_handwerker_id()
        and a.kunde_id is not null
    )
  );

-- gewerke — lesen (Stammdaten)
alter table public.gewerke enable row level security;

drop policy if exists "gewerke_portal_handwerker_select" on public.gewerke;
create policy "gewerke_portal_handwerker_select"
  on public.gewerke for select to authenticated
  using (public.is_portal_handwerker() or public.is_crm_staff());
