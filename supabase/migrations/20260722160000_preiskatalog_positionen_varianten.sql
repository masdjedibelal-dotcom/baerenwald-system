-- =====================================================================
-- Preiskatalog: Positionen + Varianten (+ Lernsignale für KI)
-- Reihenfolge: 1) dieses Skript  2) CSVs importieren (erst Positionen, dann Varianten)
--              3) Code nutzt Katalog  4) preislisten später → preislisten_legacy
-- =====================================================================

create table if not exists public.katalog_positionen (
  id                    uuid primary key default gen_random_uuid(),
  gewerk_id             uuid not null references public.gewerke(id),
  titel                 text not null,
  kategorie             text not null default 'Sonstiges'
                        check (kategorie in (
                          'Reparatur','Erneuerung','Wartung','Komplettsanierung',
                          'Teilleistung','Laufende Leistung','Nebenleistung','Entsorgung',
                          'Baumarbeiten','Verlegen','Aufbereitung','Abbruch',
                          'Innen','Außen','Wände','Decken','Sonstiges'
                        )),
  beschreibung_standard text not null default '',
  aktiv                 boolean not null default true,
  sortierung            integer not null default 0,
  created_at            timestamptz not null default now(),
  unique (gewerk_id, titel)
);

create table if not exists public.katalog_varianten (
  id           uuid primary key default gen_random_uuid(),
  position_id  uuid not null references public.katalog_positionen(id) on delete cascade,
  variante     text not null default '',
  beschreibung text not null default '',
  einheit      text not null
               check (einheit in (
                 'm²','lfd. m','m³','Stück','Stunde','pauschal',
                 'Monat','Saison','Besuch','m²/Monat','m²/Saison'
               )),
  preis_typ    text not null default 'ab' check (preis_typ in ('fix','ab')),
  preis        numeric(10,2) not null check (preis >= 0),
  aktiv        boolean not null default true,
  sortierung   integer not null default 0,
  created_at   timestamptz not null default now(),
  unique (position_id, variante)
);

create index if not exists katalog_positionen_gewerk_idx
  on public.katalog_positionen (gewerk_id) where aktiv;
create index if not exists katalog_varianten_position_idx
  on public.katalog_varianten (position_id) where aktiv;

-- Freie Angebotspositionen für spätere KI-Analyse (nie automatischer Katalog-Insert)
create table if not exists public.katalog_lernsignale (
  id              uuid primary key default gen_random_uuid(),
  angebot_id      uuid references public.angebote(id) on delete set null,
  lead_id         uuid,
  gewerk_id       uuid references public.gewerke(id) on delete set null,
  titel           text not null,
  beschreibung    text not null default '',
  einheit         text not null default 'pauschal',
  preis_netto     numeric(10,2) not null default 0,
  menge           numeric(12,3) not null default 1,
  quelle          text not null default 'frei'
                  check (quelle in ('frei', 'katalog_abgewandelt')),
  created_at      timestamptz not null default now()
);

create index if not exists katalog_lernsignale_angebot_idx
  on public.katalog_lernsignale (angebot_id, created_at desc);
create index if not exists katalog_lernsignale_gewerk_idx
  on public.katalog_lernsignale (gewerk_id);

alter table public.katalog_positionen enable row level security;
alter table public.katalog_varianten enable row level security;
alter table public.katalog_lernsignale enable row level security;

drop policy if exists "katalog_positionen_crm_staff_all" on public.katalog_positionen;
create policy "katalog_positionen_crm_staff_all"
  on public.katalog_positionen for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "katalog_varianten_crm_staff_all" on public.katalog_varianten;
create policy "katalog_varianten_crm_staff_all"
  on public.katalog_varianten for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "katalog_lernsignale_crm_staff_all" on public.katalog_lernsignale;
create policy "katalog_lernsignale_crm_staff_all"
  on public.katalog_lernsignale for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

comment on table public.katalog_positionen is
  'Kuratierter Preiskatalog: Positionstitel ohne Preis';
comment on table public.katalog_varianten is
  'Varianten mit Preis; IDs können alte preislisten-IDs sein';
comment on table public.katalog_lernsignale is
  'Freie Angebotspositionen für KI-Analyse — kein Auto-Insert in den Katalog';

-- Nach Code-Umstellung (später):
-- alter table public.preislisten rename to preislisten_legacy;
