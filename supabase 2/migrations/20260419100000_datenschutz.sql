-- Datenschutz: Löschprotokoll, Fristen, Kundenanfragen, Aufschub

create table if not exists public.datenschutz_loeschlog (
  id uuid primary key default gen_random_uuid(),
  typ text not null,
  referenz_id uuid,
  referenz_typ text,
  grund text not null,
  geloescht_von uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.datenschutz_loeschlog is 'Nachvollziehbarkeit gelöschter/anonymisierter personenbezogener Daten';

create table if not exists public.datenschutz_fristen (
  id uuid primary key default gen_random_uuid(),
  kategorie text not null unique,
  bezeichnung text not null,
  frist_monate int not null,
  beschreibung text,
  gesetzliche_grundlage text,
  aktiv boolean not null default true
);

create table if not exists public.datenschutz_anfragen (
  id uuid primary key default gen_random_uuid(),
  typ text not null default 'loeschung',
  name text not null,
  email text not null,
  beschreibung text,
  status text not null default 'offen',
  erledigt_at timestamptz,
  notizen text,
  created_at timestamptz not null default now()
);

comment on column public.datenschutz_anfragen.typ is 'loeschung | auskunft | einschraenkung';

create table if not exists public.datenschutz_aufschub (
  id uuid primary key default gen_random_uuid(),
  kategorie text not null,
  referenz_id uuid not null,
  gueltig_bis date not null,
  begrundung text,
  erstellt_von uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists datenschutz_aufschub_ref_idx
  on public.datenschutz_aufschub (kategorie, referenz_id, gueltig_bis desc);

insert into public.datenschutz_fristen (kategorie, bezeichnung, frist_monate, beschreibung, gesetzliche_grundlage)
values
  (
    'fotos_auftraege',
    'Fotos aus Aufträgen',
    72,
    'Fotos von Privatwohnungen aus abgeschlossenen Aufträgen',
    'DSGVO Art. 17 — Gewährleistungsfrist 5 Jahre + Puffer'
  ),
  (
    'fotos_formulare',
    'Fotos aus Handwerker-Formularen',
    72,
    'Baustellenfotos aus Handwerker-Updates',
    'DSGVO Art. 17'
  ),
  (
    'leads_abgebrochen',
    'Abgebrochene Anfragen',
    12,
    'Leads die nie zu einem Auftrag wurden',
    'DSGVO Art. 17'
  ),
  (
    'leads_abgeschlossen',
    'Abgelehnte / abgeschlossene Leads ohne Auftrag',
    24,
    'Leads ohne weiterführenden Auftrag',
    'DSGVO Art. 17'
  ),
  (
    'dokumente_compliance',
    'Compliance-Dokumente Handwerker',
    84,
    'Steuerliche Aufbewahrungspflicht',
    '§ 147 AO — 7 Jahre'
  ),
  (
    'eingangsrechnungen',
    'Eingangsrechnungen / Belege',
    120,
    'Steuerliche Aufbewahrungspflicht',
    '§ 147 AO — 10 Jahre'
  ),
  (
    'rechnungen_ausgehend',
    'Ausgehende Rechnungen',
    120,
    'Steuerliche Aufbewahrungspflicht',
    '§ 147 AO — 10 Jahre'
  ),
  (
    'kunden_daten',
    'Kundenstammdaten',
    84,
    'Nach letztem Kontakt / Auftrag',
    'DSGVO Art. 17 — berechtigtes Interesse endet nach 7 Jahren'
  ),
  (
    'abnahmeprotokolle',
    'Abnahmeprotokolle + PDFs',
    72,
    'Gewährleistungsfrist',
    'BGB § 634a — 5 Jahre + Puffer'
  )
on conflict (kategorie) do nothing;

alter table public.datenschutz_loeschlog enable row level security;
alter table public.datenschutz_fristen enable row level security;
alter table public.datenschutz_anfragen enable row level security;
alter table public.datenschutz_aufschub enable row level security;

drop policy if exists "datenschutz_loeschlog_auth_all" on public.datenschutz_loeschlog;
create policy "datenschutz_loeschlog_auth_all"
  on public.datenschutz_loeschlog for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

drop policy if exists "datenschutz_fristen_auth_all" on public.datenschutz_fristen;
create policy "datenschutz_fristen_auth_all"
  on public.datenschutz_fristen for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

drop policy if exists "datenschutz_anfragen_auth_all" on public.datenschutz_anfragen;
create policy "datenschutz_anfragen_auth_all"
  on public.datenschutz_anfragen for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

drop policy if exists "datenschutz_aufschub_auth_all" on public.datenschutz_aufschub;
create policy "datenschutz_aufschub_auth_all"
  on public.datenschutz_aufschub for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');
