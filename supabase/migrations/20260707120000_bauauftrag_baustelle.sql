-- Bauauftrag (Eigenregie): Team, Regiearbeiten, Wochenberichte, Baustellen-Dokumente

alter table public.auftraege
  add column if not exists bauleiter_name text,
  add column if not exists bauleiter_telefon text,
  add column if not exists bauleiter_email text,
  add column if not exists bau_mannschaft jsonb not null default '[]'::jsonb,
  add column if not exists bau_nachunternehmer_name text,
  add column if not exists bau_nachunternehmer_firma text;

comment on column public.auftraege.bauleiter_name is 'Bauleitung (Eigenregie / Bauauftrag)';
comment on column public.auftraege.bau_mannschaft is 'Stamm-Mannschaft auf der Baustelle (Namen)';

create table if not exists public.auftrag_regiearbeiten (
  id uuid primary key default uuid_generate_v4(),
  auftrag_id uuid not null references public.auftraege(id) on delete cascade,
  datum date not null default current_date,
  bezeichnung text not null,
  beschreibung text,
  personen_anzahl int not null default 1,
  stunden numeric(8,2) not null default 0,
  material text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists auftrag_regiearbeiten_auftrag_idx
  on public.auftrag_regiearbeiten (auftrag_id, datum desc);

create table if not exists public.auftrag_wochenberichte (
  id uuid primary key default uuid_generate_v4(),
  auftrag_id uuid not null references public.auftraege(id) on delete cascade,
  wochen_nummer int not null default 1,
  kalenderwoche int not null,
  jahr int not null,
  von_datum date not null,
  bis_datum date not null,
  fazit text,
  ausblick text,
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists auftrag_wochenberichte_kw_uq
  on public.auftrag_wochenberichte (auftrag_id, kalenderwoche, jahr);

create index if not exists auftrag_wochenberichte_auftrag_idx
  on public.auftrag_wochenberichte (auftrag_id, von_datum desc);

create table if not exists public.auftrag_baustellen_dokumente (
  id uuid primary key default uuid_generate_v4(),
  auftrag_id uuid not null references public.auftraege(id) on delete cascade,
  typ text not null check (typ in ('tagesbericht', 'wochenbericht', 'regiebericht', 'sonstiges')),
  titel text not null,
  datei_url text not null,
  kalenderwoche int,
  jahr int,
  wochen_nummer int,
  quelle text not null default 'upload' check (quelle in ('upload', 'generiert')),
  referenz_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists auftrag_baustellen_dokumente_auftrag_idx
  on public.auftrag_baustellen_dokumente (auftrag_id, created_at desc);

alter table public.auftrag_regiearbeiten enable row level security;
alter table public.auftrag_wochenberichte enable row level security;
alter table public.auftrag_baustellen_dokumente enable row level security;

drop policy if exists "auftrag_regiearbeiten_auth_all" on public.auftrag_regiearbeiten;
create policy "auftrag_regiearbeiten_auth_all"
  on public.auftrag_regiearbeiten for all using (auth.role() = 'authenticated');

drop policy if exists "auftrag_wochenberichte_auth_all" on public.auftrag_wochenberichte;
create policy "auftrag_wochenberichte_auth_all"
  on public.auftrag_wochenberichte for all using (auth.role() = 'authenticated');

drop policy if exists "auftrag_baustellen_dokumente_auth_all" on public.auftrag_baustellen_dokumente;
create policy "auftrag_baustellen_dokumente_auth_all"
  on public.auftrag_baustellen_dokumente for all using (auth.role() = 'authenticated');
