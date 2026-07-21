-- Manuell im Supabase SQL Editor ausführen (siehe supabase/migrations/20260705120000_ist_bauprojekt_bautagesberichte.sql)

alter table public.leads
  add column if not exists ist_bauprojekt boolean not null default false;

alter table public.auftraege
  add column if not exists ist_bauprojekt boolean not null default false;

create table if not exists public.auftrag_bautagesberichte (
  id uuid primary key default uuid_generate_v4(),
  auftrag_id uuid not null references public.auftraege(id) on delete cascade,
  tag_nummer int not null default 1,
  datum date not null default current_date,
  arbeitszeit_von text,
  arbeitszeit_bis text,
  wetter text,
  auftraggeber_name text,
  auftraggeber_adresse text,
  nachunternehmer_name text,
  nachunternehmer_firma text,
  leistungen jsonb not null default '[]'::jsonb,
  behinderungen text,
  qualitaetssicherung text,
  risiken jsonb not null default '[]'::jsonb,
  zusammenfassung text,
  personal_namen jsonb not null default '[]'::jsonb,
  fotos jsonb not null default '[]'::jsonb,
  handwerker_id uuid references public.handwerker(id) on delete set null,
  pdf_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists auftrag_bautagesberichte_auftrag_idx
  on public.auftrag_bautagesberichte (auftrag_id, datum desc, tag_nummer desc);

create unique index if not exists auftrag_bautagesberichte_tag_uq
  on public.auftrag_bautagesberichte (auftrag_id, tag_nummer);

alter table public.auftrag_bautagesberichte enable row level security;

drop policy if exists "auftrag_bautagesberichte_auth_all" on public.auftrag_bautagesberichte;
create policy "auftrag_bautagesberichte_auth_all"
  on public.auftrag_bautagesberichte for all
  using (auth.role() = 'authenticated');
