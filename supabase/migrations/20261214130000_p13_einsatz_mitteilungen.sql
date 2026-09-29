-- P13: Mitteilungen des Partners zu einem Einsatz (Zielbild 29.09.2026).
-- Regie (Stunden + Beschreibung + optional Foto) und Behinderung (Beschreibung).
-- Bärenwald übernimmt Regie als Auftragsposition mit Aufschlag; keine Zustimmung des Kunden nötig.

create table if not exists public.einsatz_mitteilungen (
  id uuid primary key default gen_random_uuid(),
  einsatz_id uuid not null references public.einsaetze (id) on delete cascade,
  auftrag_id uuid not null references public.auftraege (id) on delete cascade,
  handwerker_id uuid not null references public.handwerker (id),
  typ text not null check (typ in ('regie', 'behinderung')),
  text text not null,
  stunden numeric(8, 2),
  dateien jsonb not null default '[]'::jsonb,
  status text not null default 'offen' check (status in ('offen', 'uebernommen', 'erledigt')),
  position_id uuid references public.auftrag_positionen (id) on delete set null,
  erledigt_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists einsatz_mitteilungen_auftrag_idx on public.einsatz_mitteilungen (auftrag_id, status);

alter table public.einsatz_mitteilungen enable row level security;

drop policy if exists "einsatz_mitteilungen_auth_all" on public.einsatz_mitteilungen;
create policy "einsatz_mitteilungen_auth_all"
  on public.einsatz_mitteilungen for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');
