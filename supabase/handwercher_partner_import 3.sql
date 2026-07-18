-- ============================================================================
-- Bärenwald CRM: Partner-, Compliance- und Dokument-Schema (Basis-Import)
-- Im Supabase SQL Editor ausführen, bevor die Trigger-Migration läuft.
-- ============================================================================

-- Kategorien für Partner (Nicht-Fachbetriebe)
create table if not exists public.partner_kategorien (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.partner (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kategorie_id uuid references public.partner_kategorien (id) on delete set null,
  subkategorie text,
  ansprechpartner text,
  telefon text,
  email text,
  adresse text,
  website text,
  notizen text,
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.compliance_dokument_typen (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  bezeichnung text not null,
  beschreibung text,
  pflicht_fuer_fachbetriebe boolean not null default false,
  erneuerung_monate int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.partner_dokumente (
  id uuid primary key default gen_random_uuid(),
  handwerker_id uuid not null references public.handwerker (id) on delete cascade,
  typ text not null,
  bezeichnung text not null,
  gueltig_bis timestamptz,
  datei_url text,
  notizen text,
  hochgeladen_am timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_partner_dokumente_handwerker on public.partner_dokumente (handwerker_id);
create index if not exists idx_partner_kategorie on public.partner (kategorie_id);

-- --------------------------------------------------------------------------
-- RLS (angemeldete Dashboard-Nutzer: JWT role authenticated)
-- --------------------------------------------------------------------------
alter table public.partner_kategorien enable row level security;
alter table public.partner enable row level security;
alter table public.compliance_dokument_typen enable row level security;
alter table public.partner_dokumente enable row level security;

drop policy if exists "partner_kategorien_authenticated_select" on public.partner_kategorien;
create policy "partner_kategorien_authenticated_select"
  on public.partner_kategorien for select to authenticated using (true);
drop policy if exists "partner_kategorien_authenticated_write" on public.partner_kategorien;
create policy "partner_kategorien_authenticated_write"
  on public.partner_kategorien for all to authenticated using (true) with check (true);

drop policy if exists "partner_authenticated_select" on public.partner;
create policy "partner_authenticated_select"
  on public.partner for select to authenticated using (true);
drop policy if exists "partner_authenticated_write" on public.partner;
create policy "partner_authenticated_write"
  on public.partner for all to authenticated using (true) with check (true);

drop policy if exists "compliance_typen_authenticated_select" on public.compliance_dokument_typen;
create policy "compliance_typen_authenticated_select"
  on public.compliance_dokument_typen for select to authenticated using (true);
drop policy if exists "compliance_typen_authenticated_write" on public.compliance_dokument_typen;
create policy "compliance_typen_authenticated_write"
  on public.compliance_dokument_typen for all to authenticated using (true) with check (true);

drop policy if exists "partner_dokumente_authenticated_select" on public.partner_dokumente;
create policy "partner_dokumente_authenticated_select"
  on public.partner_dokumente for select to authenticated using (true);
drop policy if exists "partner_dokumente_authenticated_write" on public.partner_dokumente;
create policy "partner_dokumente_authenticated_write"
  on public.partner_dokumente for all to authenticated using (true) with check (true);

-- --------------------------------------------------------------------------
-- Seed: Partner-Kategorien (Reihenfolge über sort_order)
-- --------------------------------------------------------------------------
insert into public.partner_kategorien (name, slug, sort_order)
values
  ('Hausverwaltungen', 'hausverwaltungen', 10),
  ('Baustoff', 'baustoff', 20),
  ('Entsorgung', 'entsorgung', 30),
  ('Dienstleistungen', 'dienstleistungen', 40),
  ('Logistik', 'logistik', 50),
  ('Gastronomie', 'gastronomie', 60),
  ('Sonstige', 'sonstige', 90)
on conflict (slug) do nothing;

-- --------------------------------------------------------------------------
-- Seed: 11 Standard-Compliance-Dokumenttypen (anpassbar in der App)
-- --------------------------------------------------------------------------
insert into public.compliance_dokument_typen (slug, bezeichnung, beschreibung, pflicht_fuer_fachbetriebe, erneuerung_monate, sort_order)
values
  ('soka_bescheinigung', 'SoKA-Bescheinigung (soziale Absicherung)', null, true, 12, 10),
  ('freistellung_13b', 'Freistellungsbescheinigung §13b UStG', null, true, 12, 20),
  ('handelsregister', 'Handelsregisterauszug', null, true, 12, 30),
  ('gewerbeanmeldung', 'Gewerbeanmeldung / Gewerbeschein', null, true, null, 40),
  ('betriebshaftpflicht', 'Betriebshaftpflichtversicherung', null, true, 12, 50),
  ('berufsgenossenschaft', 'Mitgliedschaft Berufsgenossenschaft / Unfallversicherung', null, true, 12, 60),
  ('sicherheitsunterweisung', 'Sicherheitsunterweisung / Baustelleneinweisung', null, true, 12, 70),
  ('fachkraefte_nachweis', 'Nachweis Fachkräfte / Meister- oder Gesellenbriefe', null, true, null, 80),
  ('mindestlohn_nachweis', 'Mindestlohn-/Entgeltnachweise', null, true, 12, 90),
  ('umwelt_abfall', 'Umwelt / Abfallnachweise (falls relevant)', null, false, 12, 100),
  ('krankenkasse_unbedenklichkeit', 'Unbedenklichkeitsbescheinigung Krankenkasse', null, true, 12, 110)
on conflict (slug) do nothing;

-- Optional: hier eigene INSERTs für 22 Fachbetriebe (handwerker) / 24 Partner ergänzen
-- oder per CSV/Table-Editor importieren.
