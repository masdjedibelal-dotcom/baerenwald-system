-- Servus TEO Arbeitsplatz: Einheiten am Objekt (optional, schlank) — Auswahl beim Vorgang → leads.melder_einheit

create table if not exists public.teo_einheiten (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references public.kunden (id) on delete cascade,
  kunde_objekt_id uuid not null references public.kunden_objekte (id) on delete cascade,
  bezeichnung text not null,
  lage text,
  notiz text,
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists teo_einheiten_objekt_idx on public.teo_einheiten (kunde_objekt_id);
alter table public.teo_einheiten enable row level security;
drop policy if exists "teo_einheiten_service" on public.teo_einheiten;
create policy "teo_einheiten_service" on public.teo_einheiten for all to service_role using (true) with check (true);
