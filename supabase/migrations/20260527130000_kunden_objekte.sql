-- Verwaltete Objekte (WEG, Gebäude, …) pro Gewerbe-/Hausverwaltungs-Kunde

create table if not exists public.kunden_objekte (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references public.kunden (id) on delete cascade,
  titel text not null,
  strasse text,
  hausnummer text,
  plz text,
  ort text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kunden_objekte_kunde_idx on public.kunden_objekte (kunde_id);
create index if not exists kunden_objekte_kunde_titel_idx on public.kunden_objekte (kunde_id, titel);

alter table public.kunden_objekte enable row level security;

drop policy if exists "kunden_objekte_authenticated_all" on public.kunden_objekte;

create policy "kunden_objekte_authenticated_all"
  on public.kunden_objekte
  for all
  to authenticated
  using (true)
  with check (true);

alter table public.leads
  add column if not exists kunde_objekt_id uuid references public.kunden_objekte (id) on delete set null;

alter table public.angebote
  add column if not exists kunde_objekt_id uuid references public.kunden_objekte (id) on delete set null;

comment on table public.kunden_objekte is 'Objekte/WEGs unter einem Gewerbe- oder Hausverwaltungs-Kunden';
comment on column public.leads.kunde_objekt_id is 'Ausgewähltes Objekt für diese Anfrage (Wizard/PDF)';
comment on column public.angebote.kunde_objekt_id is 'Ausführungsort für dieses Angebot (PDF: Durchführung in)';
