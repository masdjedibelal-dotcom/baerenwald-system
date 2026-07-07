-- HV-Plattform Wellen 0–3: Fundament + Go-Live + Abo/Katalog
-- Idempotent; RLS für neue Tabellen inklusive.

-- ---------------------------------------------------------------------------
-- 1) Leads / Aufträge — Kostenträger, Phase, Tracking, Versicherung
-- ---------------------------------------------------------------------------
alter table public.leads
  add column if not exists vorgang_phase text,
  add column if not exists kostentraeger text,
  add column if not exists kostentraeger_vorgeschlagen boolean not null default false,
  add column if not exists melde_tracking_token text,
  add column if not exists versicherungs_nr text;

alter table public.leads drop constraint if exists leads_kostentraeger_check;
alter table public.leads add constraint leads_kostentraeger_check check (
  kostentraeger is null
  or kostentraeger in ('gemeinschaft', 'sondereigentum', 'mieter', 'versicherung', 'unklar')
);

create unique index if not exists leads_melde_tracking_token_uidx
  on public.leads (melde_tracking_token)
  where melde_tracking_token is not null;

alter table public.auftraege
  add column if not exists kostentraeger text,
  add column if not exists versicherungs_nr text,
  add column if not exists versicherungsakte_pdf_url text;

alter table public.rechnungen
  add column if not exists kostentraeger text,
  add column if not exists lohnanteil_eur numeric(10,2),
  add column if not exists lohnanteil_prozent numeric(5,2);

alter table public.auftraege drop constraint if exists auftraege_kostentraeger_check;
alter table public.auftraege add constraint auftraege_kostentraeger_check check (
  kostentraeger is null
  or kostentraeger in ('gemeinschaft', 'sondereigentum', 'mieter', 'versicherung', 'unklar')
);

-- ---------------------------------------------------------------------------
-- 2) Objekte — Kostenstelle + Einheiten
-- ---------------------------------------------------------------------------
alter table public.kunden_objekte
  add column if not exists kostenstelle_nr text;

create table if not exists public.objekt_einheiten (
  id uuid primary key default gen_random_uuid(),
  kunde_objekt_id uuid not null references public.kunden_objekte(id) on delete cascade,
  bezeichnung text not null,
  wohnflaeche_m2 numeric,
  sort_order int not null default 0,
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists objekt_einheiten_objekt_idx
  on public.objekt_einheiten (kunde_objekt_id);

-- ---------------------------------------------------------------------------
-- 3) HV Multi-User
-- ---------------------------------------------------------------------------
create table if not exists public.kunden_mitglieder (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references public.kunden(id) on delete cascade,
  auth_user_id uuid not null,
  rolle text not null default 'sachbearbeiter',
  aktiv boolean not null default true,
  eingeladen_am timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (kunde_id, auth_user_id)
);

alter table public.kunden_mitglieder drop constraint if exists kunden_mitglieder_rolle_check;
alter table public.kunden_mitglieder add constraint kunden_mitglieder_rolle_check check (
  rolle in ('admin', 'sachbearbeiter', 'lesen')
);

create index if not exists kunden_mitglieder_auth_idx
  on public.kunden_mitglieder (auth_user_id)
  where aktiv = true;

-- ---------------------------------------------------------------------------
-- 4) Audit-Trail
-- ---------------------------------------------------------------------------
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  aktion text not null,
  actor_id uuid,
  actor_rolle text,
  kunde_id uuid references public.kunden(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_entity_idx
  on public.audit_events (entity_type, entity_id, created_at desc);

create index if not exists audit_events_kunde_idx
  on public.audit_events (kunde_id, created_at desc)
  where kunde_id is not null;

alter table public.audit_events enable row level security;

drop policy if exists audit_events_org_select on public.audit_events;
create policy audit_events_org_select on public.audit_events
  for select to authenticated
  using (kunde_id = public.portal_kunde_id());

drop policy if exists audit_events_service on public.audit_events;
create policy audit_events_service on public.audit_events
  for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 5) Gewährleistungs-Register
-- ---------------------------------------------------------------------------
create table if not exists public.gewaehrleistungen (
  id uuid primary key default gen_random_uuid(),
  auftrag_id uuid not null references public.auftraege(id) on delete cascade,
  partner_id uuid references public.handwerker(id) on delete set null,
  abnahme_am date not null,
  frist_bis date not null,
  status text not null default 'aktiv',
  mangel_lead_id uuid references public.leads(id) on delete set null,
  regress_notiz text,
  wiedervorlage_am date,
  created_at timestamptz not null default now()
);

create index if not exists gewaehrleistungen_auftrag_idx on public.gewaehrleistungen (auftrag_id);
create index if not exists gewaehrleistungen_frist_idx on public.gewaehrleistungen (frist_bis);

-- ---------------------------------------------------------------------------
-- 6) Katalog-Produkte & Preise (CRM-pflegbar)
-- ---------------------------------------------------------------------------
create table if not exists public.katalog_produkte (
  slug text primary key,
  bezeichnung text not null,
  familie text not null,
  preis_typ text not null default 'fix',
  lohnanteil_prozent numeric not null default 85,
  has_fixpreis boolean not null default false,
  beschreibung text,
  scope_json jsonb not null default '{}'::jsonb,
  aktiv boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.katalog_produkte drop constraint if exists katalog_produkte_preis_typ_check;
alter table public.katalog_produkte add constraint katalog_produkte_preis_typ_check check (
  preis_typ in ('fix', 'band', 'stundensatz', 'm2_fix', 'm2_band')
);

create table if not exists public.katalog_preise (
  id uuid primary key default gen_random_uuid(),
  produkt_slug text not null references public.katalog_produkte(slug) on delete cascade,
  groessenklasse text,
  preis_min numeric,
  preis_max numeric,
  preis_fix numeric,
  stundensatz numeric,
  m2_satz numeric,
  lohnanteil_prozent numeric,
  aktiv boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists katalog_preise_produkt_idx on public.katalog_preise (produkt_slug);

-- ---------------------------------------------------------------------------
-- 7) Objekt-Abos & Sammelrechnungen
-- ---------------------------------------------------------------------------
create table if not exists public.objekt_abos (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references public.kunden(id) on delete cascade,
  kunde_objekt_id uuid not null references public.kunden_objekte(id) on delete cascade,
  produkt_slug text not null,
  service_modus text not null default 'paket',
  status text not null default 'aktiv',
  start_am date not null,
  end_am date,
  kuendigung_eingereicht_am timestamptz,
  kuendigungsfrist_wochen int not null default 4,
  monatspreis_netto numeric not null,
  lohnanteil_prozent numeric not null default 85,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.objekt_abos drop constraint if exists objekt_abos_status_check;
alter table public.objekt_abos add constraint objekt_abos_status_check check (
  status in ('aktiv', 'gekuendigt', 'beendet', 'entwurf')
);

create table if not exists public.sammelrechnungen (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references public.kunden(id) on delete cascade,
  periode text not null,
  status text not null default 'entwurf',
  gesamt_netto numeric,
  pdf_url text,
  created_at timestamptz not null default now()
);

create unique index if not exists sammelrechnungen_kunde_periode_uidx
  on public.sammelrechnungen (kunde_id, periode);

create table if not exists public.sammelrechnung_positionen (
  id uuid primary key default gen_random_uuid(),
  sammelrechnung_id uuid not null references public.sammelrechnungen(id) on delete cascade,
  objekt_abo_id uuid references public.objekt_abos(id) on delete set null,
  kunde_objekt_id uuid references public.kunden_objekte(id) on delete set null,
  beschreibung text not null,
  netto numeric not null,
  ust_satz numeric not null default 19,
  lohnanteil_eur numeric not null default 0,
  lohnanteil_prozent numeric not null default 0,
  leistungszeitraum_von date,
  leistungszeitraum_bis date,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------------------
-- 8) portal_kunde_id — Multi-User (Mitgliedschaft)
-- ---------------------------------------------------------------------------
create or replace function public.portal_kunde_id()
returns uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    (select k.id from public.kunden k where k.auth_user_id = auth.uid() limit 1),
    (select m.kunde_id from public.kunden_mitglieder m
     where m.auth_user_id = auth.uid() and m.aktiv = true limit 1)
  );
$$;

create or replace function public.portal_org_mitglied_rolle()
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    (select 'admin' from public.kunden k
     where k.auth_user_id = auth.uid() and k.portal_modus = 'organisation' limit 1),
    (select m.rolle from public.kunden_mitglieder m
     where m.auth_user_id = auth.uid() and m.aktiv = true limit 1)
  );
$$;

create or replace function public.portal_organisation_objekt_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select o.id
  from public.kunden_objekte o
  where o.kunde_id = public.portal_kunde_id();
$$;

grant execute on function public.portal_org_mitglied_rolle() to authenticated, service_role;

-- RLS objekt_einheiten
alter table public.objekt_einheiten enable row level security;
drop policy if exists objekt_einheiten_org on public.objekt_einheiten;
create policy objekt_einheiten_org on public.objekt_einheiten
  for all to authenticated
  using (
    kunde_objekt_id in (select public.portal_organisation_objekt_ids())
  )
  with check (
    kunde_objekt_id in (select public.portal_organisation_objekt_ids())
  );

drop policy if exists objekt_einheiten_service on public.objekt_einheiten;
create policy objekt_einheiten_service on public.objekt_einheiten
  for all to service_role using (true) with check (true);

-- RLS kunden_mitglieder
alter table public.kunden_mitglieder enable row level security;
drop policy if exists kunden_mitglieder_org_admin on public.kunden_mitglieder;
create policy kunden_mitglieder_org_admin on public.kunden_mitglieder
  for select to authenticated
  using (kunde_id = public.portal_kunde_id());

drop policy if exists kunden_mitglieder_service on public.kunden_mitglieder;
create policy kunden_mitglieder_service on public.kunden_mitglieder
  for all to service_role using (true) with check (true);

-- RLS objekt_abos
alter table public.objekt_abos enable row level security;
drop policy if exists objekt_abos_org on public.objekt_abos;
create policy objekt_abos_org on public.objekt_abos
  for all to authenticated
  using (kunde_id = public.portal_kunde_id())
  with check (kunde_id = public.portal_kunde_id());

drop policy if exists objekt_abos_service on public.objekt_abos;
create policy objekt_abos_service on public.objekt_abos
  for all to service_role using (true) with check (true);

-- Katalog: read für authenticated org + service
alter table public.katalog_produkte enable row level security;
alter table public.katalog_preise enable row level security;

drop policy if exists katalog_produkte_read on public.katalog_produkte;
create policy katalog_produkte_read on public.katalog_produkte
  for select to authenticated using (aktiv = true);

drop policy if exists katalog_preise_read on public.katalog_preise;
create policy katalog_preise_read on public.katalog_preise
  for select to authenticated using (aktiv = true);

drop policy if exists katalog_produkte_service on public.katalog_produkte;
create policy katalog_produkte_service on public.katalog_produkte
  for all to service_role using (true) with check (true);

drop policy if exists katalog_preise_service on public.katalog_preise;
create policy katalog_preise_service on public.katalog_preise
  for all to service_role using (true) with check (true);
