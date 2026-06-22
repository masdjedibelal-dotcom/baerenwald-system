-- Aufträge: Betreuer, Fortschritt, nächster Schritt (Kunden-Seite)
alter table public.auftraege
  add column if not exists betreuer_id uuid references auth.users (id) on delete set null;

alter table public.auftraege
  add column if not exists fortschritt int not null default 0;

comment on column public.auftraege.fortschritt is '0–100, Anzeige Fortschrittsbalken';

alter table public.auftraege
  add column if not exists naechster_schritt text;

comment on column public.auftraege.naechster_schritt is 'Freitext „Nächster Schritt“ auf der Kunden-Status-Seite';

-- Meilensteine je Auftrag
create table if not exists public.auftrag_milestones (
  id uuid primary key default gen_random_uuid (),
  auftrag_id uuid not null references public.auftraege (id) on delete cascade,
  titel text not null,
  beschreibung text,
  datum date,
  erledigt boolean not null default false,
  erledigt_at timestamptz,
  fuer_kunden_sichtbar boolean not null default false,
  sort_order int not null default 0,
  ist_system boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists milestones_auftrag_idx on public.auftrag_milestones (auftrag_id, sort_order);

comment on table public.auftrag_milestones is 'Projekt-Meilensteine; System-Zeilen haben ist_system = true';

-- Handwerker-Formular-Tabs (pro Auftrag, optional je HW)
create table if not exists public.hw_formular_tabs (
  id uuid primary key default gen_random_uuid (),
  auftrag_id uuid not null references public.auftraege (id) on delete cascade,
  handwerker_id uuid references public.handwerker (id) on delete set null,
  name text not null,
  beschreibung text,
  felder jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists formular_tabs_auftrag_idx on public.hw_formular_tabs (auftrag_id, sort_order);

-- Einreichungen (Token-Link für Handwerker, ohne Login)
create table if not exists public.hw_formular_einreichungen (
  id uuid primary key default gen_random_uuid (),
  tab_id uuid not null references public.hw_formular_tabs (id) on delete cascade,
  auftrag_id uuid not null references public.auftraege (id) on delete cascade,
  handwerker_id uuid references public.handwerker (id) on delete set null,
  token text not null default encode(gen_random_bytes (32), 'hex'),
  felder_werte jsonb not null default '{}'::jsonb,
  foto_urls text[] not null default '{}',
  status text not null default 'offen',
  gesendet_at timestamptz,
  eingereicht_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists hw_formular_einreichungen_token_unique on public.hw_formular_einreichungen (token);

create index if not exists einreichungen_token_idx on public.hw_formular_einreichungen (token);

create index if not exists einreichungen_auftrag_idx on public.hw_formular_einreichungen (auftrag_id);

comment on column public.hw_formular_einreichungen.status is 'offen | ausgefuellt | abgeschlossen';

-- RLS: CRM nur für eingeloggte Nutzer:innen
alter table public.auftrag_milestones enable row level security;

alter table public.hw_formular_tabs enable row level security;

alter table public.hw_formular_einreichungen enable row level security;

drop policy if exists "auftrag_milestones_auth_all" on public.auftrag_milestones;

create policy "auftrag_milestones_auth_all"
  on public.auftrag_milestones for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

drop policy if exists "hw_formular_tabs_auth_all" on public.hw_formular_tabs;

create policy "hw_formular_tabs_auth_all"
  on public.hw_formular_tabs for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

drop policy if exists "hw_formular_einreichungen_auth_all" on public.hw_formular_einreichungen;

create policy "hw_formular_einreichungen_auth_all"
  on public.hw_formular_einreichungen for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

-- Öffentlicher Zugriff per Token: NICHT über breites RLS (token is not null),
-- sondern über API-Routen mit Service Role (siehe /api/formular/...).
