-- Bautagebuch-Einträge pro Auftrag (Kunden-Updates)

create table if not exists public.auftrag_bautagebuch_eintraege (
  id uuid primary key default uuid_generate_v4(),
  auftrag_id uuid not null references public.auftraege(id) on delete cascade,
  timeline_id uuid references public.auftrag_timeline(id) on delete set null,
  titel text not null,
  beschreibung text,
  datum date not null default current_date,
  foto_urls jsonb not null default '[]'::jsonb,
  fuer_kunde_freigegeben boolean not null default false,
  freigegeben_at timestamptz,
  an_kunde_gesendet_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists auftrag_bautagebuch_auftrag_idx
  on public.auftrag_bautagebuch_eintraege (auftrag_id, datum desc, sort_order);

alter table public.auftrag_bautagebuch_eintraege enable row level security;

drop policy if exists "auftrag_bautagebuch_auth_all" on public.auftrag_bautagebuch_eintraege;
create policy "auftrag_bautagebuch_auth_all"
  on public.auftrag_bautagebuch_eintraege for all
  using (auth.role() = 'authenticated');

comment on table public.auftrag_bautagebuch_eintraege is 'Bautagebuch / Kunden-Updates zum Auftrag';
