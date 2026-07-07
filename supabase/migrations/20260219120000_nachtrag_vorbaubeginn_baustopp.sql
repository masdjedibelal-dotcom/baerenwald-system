-- Nachtrag: Kunden-Bestätigung, Handwercher-Freigabe, Beschreibung
-- (token existiert bereits in nachtraege)

alter table public.nachtraege
  add column if not exists beschreibung text;

alter table public.nachtraege
  add column if not exists kunde_bestaetigt_at timestamptz;

alter table public.nachtraege
  add column if not exists kunde_ip text;

alter table public.nachtraege
  add column if not exists handwercher_bestaetigt boolean not null default false;

alter table public.nachtraege
  add column if not exists handwercher_bestaetigt_at timestamptz;

alter table public.nachtraege
  add column if not exists abgelehnt_grund text;

comment on column public.nachtraege.kunde_bestaetigt_at is 'Kundenfreigabe Nachtrag (öffentlicher Link)';
comment on column public.nachtraege.handwercher_bestaetigt is 'Manuell: ausführender Handwercher hat Mehrkosten bestätigt';

-- Vor-Baubeginn Protokoll
create table if not exists public.vor_baubeginn_protokolle (
  id uuid primary key default gen_random_uuid(),
  auftrag_id uuid not null references public.auftraege (id) on delete cascade,
  erstellt_von uuid references auth.users (id) on delete set null,
  adresse text,
  datum date not null default (current_date),
  bereiche_dokumentiert text[],
  vorhandene_schaeden text,
  besonderheiten text,
  foto_urls text[] not null default '{}',
  kunde_informiert boolean not null default false,
  abgeschlossen boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_vor_baubeginn_auftrag
  on public.vor_baubeginn_protokolle (auftrag_id, created_at desc);

comment on table public.vor_baubeginn_protokolle is 'Zustand der Baustelle vor erstem Einsatz (Haftung Vorschäden)';

alter table public.vor_baubeginn_protokolle enable row level security;

drop policy if exists "vor_baubeginn_protokolle_auth_all" on public.vor_baubeginn_protokolle;
create policy "vor_baubeginn_protokolle_auth_all"
  on public.vor_baubeginn_protokolle
  for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

-- Witterungs- / Baustopp
create table if not exists public.baustopps (
  id uuid primary key default gen_random_uuid(),
  auftrag_id uuid not null references public.auftraege (id) on delete cascade,
  typ text not null default 'witterung',
  grund text not null,
  beginn_datum date not null,
  ende_datum date,
  verzoegerung_tage int,
  altes_enddatum date,
  neues_enddatum date,
  kunde_informiert boolean not null default false,
  erstellt_von uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_baustopps_auftrag
  on public.baustopps (auftrag_id, beginn_datum desc);

comment on table public.baustopps is 'Baustopps (Witterung, Material, Zugang, …) mit Auswirkung auf Enddatum';

alter table public.baustopps enable row level security;

drop policy if exists "baustopps_auth_all" on public.baustopps;
create policy "baustopps_auth_all"
  on public.baustopps
  for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

-- Hinweis: Öffentlicher Nachtrag-Link läuft über Next.js (Service Role),
-- nicht über anon Supabase — keine zusätzliche SELECT/UPDATE-Policy auf nachtraege für anon.
