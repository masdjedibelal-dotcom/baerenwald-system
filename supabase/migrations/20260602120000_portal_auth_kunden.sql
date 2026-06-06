-- Gleiche Migration wie handwerks-plattform/supabase/migrations/20260602120000_portal_auth_kunden.sql

alter table public.kunden
  add column if not exists auth_user_id uuid;

comment on column public.kunden.auth_user_id is
  'Supabase Auth User des Kundenportals (nicht CRM-Mitarbeiter).';

create unique index if not exists kunden_auth_user_id_unique_idx
  on public.kunden (auth_user_id)
  where auth_user_id is not null;

do $migration$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'kunden_auth_user_id_fkey'
      and conrelid = 'public.kunden'::regclass
  ) then
    alter table public.kunden
      add constraint kunden_auth_user_id_fkey
      foreign key (auth_user_id) references auth.users (id) on delete set null;
  end if;
end $migration$;

create index if not exists kunden_auth_user_id_idx on public.kunden (auth_user_id);

do $migration$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'kunden'
      and column_name = 'auth_user_id'
  ) then
    raise exception
      'Spalte kunden.auth_user_id fehlt. Bitte Schritt 1 vollständig ausführen.';
  end if;
end $migration$;

drop policy if exists "portal_kunden" on public.kunden;

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'kunden'
      and (
        policyname ilike '%portal_token%'
        or policyname ilike 'portal_kunden%'
      )
  loop
    execute format('drop policy if exists %I on public.kunden', pol.policyname);
  end loop;
end $$;

alter table public.kunden drop column if exists portal_token;

create or replace function public.is_crm_staff()
returns boolean
language sql
stable
security definer
set search_path = public
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
as $$
  select id from public.kunden where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.portal_kunde_lead_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select l.id
  from public.leads l
  where l.kunde_id = public.portal_kunde_id();
$$;

revoke all on function public.is_crm_staff() from public;
revoke all on function public.portal_kunde_id() from public;
revoke all on function public.portal_kunde_lead_ids() from public;
grant execute on function public.is_crm_staff() to authenticated, service_role;
grant execute on function public.portal_kunde_id() to authenticated, service_role;
grant execute on function public.portal_kunde_lead_ids() to authenticated, service_role;

alter table public.kunden enable row level security;

drop policy if exists "kunden_crm_staff_all" on public.kunden;
create policy "kunden_crm_staff_all"
  on public.kunden for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "kunden_portal_select_own" on public.kunden;
create policy "kunden_portal_select_own"
  on public.kunden for select
  to authenticated
  using (
    auth_user_id = auth.uid()
    and not public.is_crm_staff()
  );

drop policy if exists "kunden_portal_update_own" on public.kunden;
create policy "kunden_portal_update_own"
  on public.kunden for update
  to authenticated
  using (auth_user_id = auth.uid() and not public.is_crm_staff())
  with check (auth_user_id = auth.uid() and not public.is_crm_staff());

alter table public.leads enable row level security;

drop policy if exists "leads_crm_staff_all" on public.leads;
create policy "leads_crm_staff_all"
  on public.leads for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "leads_portal_select" on public.leads;
create policy "leads_portal_select"
  on public.leads for select to authenticated
  using (
    not public.is_crm_staff()
    and kunde_id = public.portal_kunde_id()
  );

alter table public.auftraege enable row level security;

drop policy if exists "auftraege_crm_staff_all" on public.auftraege;
create policy "auftraege_crm_staff_all"
  on public.auftraege for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "auftraege_portal_select" on public.auftraege;
create policy "auftraege_portal_select"
  on public.auftraege for select to authenticated
  using (
    not public.is_crm_staff()
    and (
      kunde_id = public.portal_kunde_id()
      or lead_id in (select public.portal_kunde_lead_ids())
    )
  );

alter table public.angebote enable row level security;

drop policy if exists "angebote_crm_staff_all" on public.angebote;
create policy "angebote_crm_staff_all"
  on public.angebote for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "angebote_portal_select" on public.angebote;
create policy "angebote_portal_select"
  on public.angebote for select to authenticated
  using (
    not public.is_crm_staff()
    and lead_id in (select public.portal_kunde_lead_ids())
  );

drop policy if exists "auftrag_positionen_portal_select" on public.auftrag_positionen;
create policy "auftrag_positionen_portal_select"
  on public.auftrag_positionen for select to authenticated
  using (
    not public.is_crm_staff()
    and fuer_kunde_sichtbar = true
    and auftrag_id in (
      select a.id from public.auftraege a
      where a.kunde_id = public.portal_kunde_id()
         or a.lead_id in (select public.portal_kunde_lead_ids())
    )
  );

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'bautagebuch'
  ) then
    execute 'alter table public.bautagebuch enable row level security';
    execute 'drop policy if exists "bautagebuch_portal_select" on public.bautagebuch';
    execute $p$
      create policy "bautagebuch_portal_select"
        on public.bautagebuch for select to authenticated
        using (
          not public.is_crm_staff()
          and fuer_kunde_sichtbar = true
          and auftrag_id in (
            select a.id from public.auftraege a
            where a.kunde_id = public.portal_kunde_id()
               or a.lead_id in (select public.portal_kunde_lead_ids())
          )
        )
    $p$;
  end if;
end $$;

drop policy if exists "rechnungen_portal_select" on public.rechnungen;
create policy "rechnungen_portal_select"
  on public.rechnungen for select to authenticated
  using (
    not public.is_crm_staff()
    and status = 'gesendet'
    and auftrag_id in (
      select a.id from public.auftraege a
      where a.kunde_id = public.portal_kunde_id()
         or a.lead_id in (select public.portal_kunde_lead_ids())
    )
  );

drop policy if exists "auftrag_timeline_portal_select" on public.auftrag_timeline;
create policy "auftrag_timeline_portal_select"
  on public.auftrag_timeline for select to authenticated
  using (
    not public.is_crm_staff()
    and fuer_kunde_freigegeben = true
    and auftrag_id in (
      select a.id from public.auftraege a
      where a.kunde_id = public.portal_kunde_id()
         or a.lead_id in (select public.portal_kunde_lead_ids())
    )
  );
