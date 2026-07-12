-- Strukturiertes Abnahmeprotokoll (Checkliste, Mängel, PDF)

create table if not exists public.auftrag_abnahmeprotokolle (
  id uuid primary key default gen_random_uuid(),
  auftrag_id uuid not null references public.auftraege(id) on delete cascade,
  abnahme_datum date not null,
  notizen text,
  punkte jsonb not null default '[]'::jsonb,
  maengel jsonb not null default '[]'::jsonb,
  pdf_url text,
  an_kunde_gesendet_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists auftrag_abnahmeprotokolle_auftrag_idx
  on public.auftrag_abnahmeprotokolle(auftrag_id, created_at desc);

alter table public.auftrag_abnahmeprotokolle enable row level security;

create policy "auth_all" on public.auftrag_abnahmeprotokolle for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

comment on table public.auftrag_abnahmeprotokolle is 'Checklisten-Abnahmeprotokoll inkl. Mängelliste und PDF';
