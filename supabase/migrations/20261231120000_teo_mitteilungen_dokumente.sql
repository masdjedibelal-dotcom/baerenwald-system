-- Servus TEO Arbeitsplatz (T11/T12): Mitteilung ans Haus, Objekt-Dokumente, WEG-Beschluss bei Freigabe

create table if not exists public.teo_mitteilungen (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references public.kunden (id) on delete cascade,
  kunde_objekt_id uuid not null references public.kunden_objekte (id) on delete cascade,
  titel text not null,
  text text not null default '',
  gueltig_bis date,
  erstellt_von uuid references auth.users (id) on delete set null,
  erstellt_name text,
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists teo_mitteilungen_objekt_idx on public.teo_mitteilungen (kunde_objekt_id, created_at desc);
alter table public.teo_mitteilungen enable row level security;
drop policy if exists "teo_mitteilungen_service" on public.teo_mitteilungen;
create policy "teo_mitteilungen_service" on public.teo_mitteilungen for all to service_role using (true) with check (true);

-- Objekt-Dokumente: Teil der Kundenakte der Verwaltung (CRM sieht sie dort)
alter table public.kunden_dokumente add column if not exists kunde_objekt_id uuid references public.kunden_objekte (id) on delete cascade;
alter table public.kunden_dokumente add column if not exists fuer_bewohner boolean not null default false;
comment on column public.kunden_dokumente.kunde_objekt_id is 'TEO: Dokument gehört zu diesem Objekt der Verwaltung.';
comment on column public.kunden_dokumente.fuer_bewohner is 'TEO: für Mieter/Eigentümer des Objekts sichtbar (z. B. Hausordnung).';
create index if not exists kunden_dokumente_objekt_idx on public.kunden_dokumente (kunde_objekt_id) where kunde_objekt_id is not null;

-- WEG: Freigabe mit Beschluss der Eigentümerversammlung
alter table public.org_freigabe_log add column if not exists beschluss_liegt_vor boolean not null default false;
alter table public.org_freigabe_log add column if not exists beschluss_url text;
