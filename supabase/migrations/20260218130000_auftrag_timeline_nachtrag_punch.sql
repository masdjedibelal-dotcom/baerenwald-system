-- Auftrag: Timeline, Nachträge, Mängelliste (Punch List)

create table if not exists public.auftrag_timeline (
  id uuid primary key default gen_random_uuid(),
  auftrag_id uuid not null references public.auftraege (id) on delete cascade,
  typ text not null,
  titel text not null,
  beschreibung text,
  foto_urls text[] not null default '{}',
  erstellt_von uuid references auth.users (id) on delete set null,
  handwerker_id uuid references public.handwerker (id) on delete set null,
  sichtbar_fuer_kunde boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_auftrag_timeline_auftrag
  on public.auftrag_timeline (auftrag_id, created_at desc);

comment on table public.auftrag_timeline is 'Chronologische Ereignisse zum Auftrag (CRM + ggf. kundensichtbar)';

create table if not exists public.nachtraege (
  id uuid primary key default gen_random_uuid(),
  auftrag_id uuid not null references public.auftraege (id) on delete cascade,
  token text not null default encode(gen_random_bytes(24), 'hex'),
  grund text not null,
  positionen jsonb not null default '[]'::jsonb,
  gesamt_min numeric(10, 2),
  gesamt_max numeric(10, 2),
  status text not null default 'entwurf',
  gesendet_at timestamptz,
  akzeptiert_at timestamptz,
  abgelehnt_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists nachtraege_token_unique on public.nachtraege (token);

create index if not exists idx_nachtraege_auftrag on public.nachtraege (auftrag_id, created_at desc);

comment on table public.nachtraege is 'Zusatzleistungen / Preisänderungen mit Kundenfreigabe';

create table if not exists public.punch_list (
  id uuid primary key default gen_random_uuid(),
  auftrag_id uuid not null references public.auftraege (id) on delete cascade,
  gewerk_id uuid references public.gewerke (id) on delete set null,
  beschreibung text not null,
  status text not null default 'offen',
  prioritaet text not null default 'normal',
  foto_urls text[] not null default '{}',
  foto_nachher_urls text[] not null default '{}',
  behoben_at timestamptz,
  behoben_von uuid references public.handwerker (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_punch_list_auftrag on public.punch_list (auftrag_id, gewerk_id);

comment on table public.punch_list is 'Abnahme-Mängelliste';

alter table public.auftrag_timeline enable row level security;
alter table public.nachtraege enable row level security;
alter table public.punch_list enable row level security;

drop policy if exists "auftrag_timeline_auth_all" on public.auftrag_timeline;
create policy "auftrag_timeline_auth_all"
  on public.auftrag_timeline
  for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

drop policy if exists "nachtraege_auth_all" on public.nachtraege;
create policy "nachtraege_auth_all"
  on public.nachtraege
  for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

drop policy if exists "punch_list_auth_all" on public.punch_list;
create policy "punch_list_auth_all"
  on public.punch_list
  for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');
