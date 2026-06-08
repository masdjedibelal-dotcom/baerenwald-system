-- Historische Rechnungs-/Angebotsdaten für KI Analytics (Excel-Import, kein Live-CRM)

create table if not exists public.ki_historische_vorgaenge (
  id uuid primary key default gen_random_uuid(),
  dokument_nr text not null,
  dokumenttyp text not null,
  status text not null,
  kundennr text,
  kunde_name text,
  objekt_adresse text,
  gewerk text not null,
  taetigkeit text,
  netto numeric(12, 2),
  mwst numeric(12, 2),
  brutto numeric(12, 2),
  berechnung text,
  hinweis text,
  import_batch text,
  importiert_am timestamptz not null default now(),
  unique (dokument_nr)
);

create index if not exists idx_ki_hist_vorgaenge_gewerk on public.ki_historische_vorgaenge (gewerk);
create index if not exists idx_ki_hist_vorgaenge_status on public.ki_historische_vorgaenge (status);
create index if not exists idx_ki_hist_vorgaenge_kunde on public.ki_historische_vorgaenge (kundennr);

create table if not exists public.ki_historische_positionen (
  id uuid primary key default gen_random_uuid(),
  dokument_nr text not null references public.ki_historische_vorgaenge (dokument_nr) on delete cascade,
  gewerk text,
  leistung text not null,
  einheit text,
  menge numeric(12, 4),
  einzelpreis_netto numeric(12, 2),
  gesamt_netto numeric(12, 2),
  berechnung text,
  kostenart text,
  crm_modul text,
  import_batch text,
  importiert_am timestamptz not null default now()
);

create index if not exists idx_ki_hist_pos_dokument on public.ki_historische_positionen (dokument_nr);
create index if not exists idx_ki_hist_pos_gewerk on public.ki_historische_positionen (gewerk);

create table if not exists public.ki_produkt_katalog (
  id uuid primary key default gen_random_uuid(),
  hauptmodul text not null,
  untermodul text,
  typische_einheit text,
  preislogik text,
  beispiele text,
  sort_order int not null default 0,
  import_batch text,
  importiert_am timestamptz not null default now(),
  unique (hauptmodul, untermodul)
);

comment on table public.ki_historische_vorgaenge is
  'Abgeschlossene Rechnungen/Angebote aus Excel-Historie — nur für KI Analytics, nicht operatives CRM';
comment on table public.ki_historische_positionen is
  'Leistungspositionen zur Historie (Excel Leistungspositionen-Tab)';
comment on table public.ki_produkt_katalog is
  'Produkt-/Preislogik aus CRM_Struktur (Excel)';

alter table public.ki_historische_vorgaenge enable row level security;
alter table public.ki_historische_positionen enable row level security;
alter table public.ki_produkt_katalog enable row level security;

drop policy if exists "ki_historische_vorgaenge_auth_all" on public.ki_historische_vorgaenge;
create policy "ki_historische_vorgaenge_auth_all"
  on public.ki_historische_vorgaenge for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "ki_historische_positionen_auth_all" on public.ki_historische_positionen;
create policy "ki_historische_positionen_auth_all"
  on public.ki_historische_positionen for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "ki_produkt_katalog_auth_all" on public.ki_produkt_katalog;
create policy "ki_produkt_katalog_auth_all"
  on public.ki_produkt_katalog for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
