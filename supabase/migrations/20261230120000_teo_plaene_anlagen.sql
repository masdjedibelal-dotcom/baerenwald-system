-- TEO-Arbeitsplatz Schritt 2: Pläne (Putzplan, Rundgang, Wartung, Prüffristen) mit Checklisten,
-- Erledigungen (Nachweis) und schlanke Anlagen je Objekt. Bärenwald nutzt nichts davon.

create table if not exists public.teo_anlagen (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references public.kunden (id) on delete cascade,
  kunde_objekt_id uuid not null references public.kunden_objekte (id) on delete cascade,
  name text not null,
  art text not null default 'sonstiges',
  baujahr integer check (baujahr is null or (baujahr between 1800 and 2200)),
  foto_url text,
  notiz text,
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists teo_anlagen_objekt_idx on public.teo_anlagen (kunde_objekt_id);

create table if not exists public.teo_plaene (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references public.kunden (id) on delete cascade,
  kunde_objekt_id uuid not null references public.kunden_objekte (id) on delete cascade,
  anlage_id uuid references public.teo_anlagen (id) on delete set null,
  titel text not null,
  art text not null default 'kontrolle' check (art in ('reinigung', 'kontrolle', 'wartung', 'pruefung', 'winterdienst', 'garten', 'sonstiges')),
  intervall_einheit text not null default 'woche' check (intervall_einheit in ('tag', 'woche', 'monat', 'jahr')),
  intervall_anzahl integer not null default 1 check (intervall_anzahl between 1 and 120),
  naechste_faelligkeit date not null,
  zustaendig text not null default 'team' check (zustaendig in ('team', 'teo')),
  zustaendig_mitglied_id uuid references public.kunden_mitglieder (id) on delete set null,
  checkliste jsonb not null default '[]'::jsonb,
  fuer_mieter_sichtbar boolean not null default false,
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists teo_plaene_objekt_idx on public.teo_plaene (kunde_objekt_id);
create index if not exists teo_plaene_faellig_idx on public.teo_plaene (naechste_faelligkeit) where aktiv;

create table if not exists public.teo_plan_erledigungen (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.teo_plaene (id) on delete cascade,
  faellig_am date not null,
  erledigt_am timestamptz not null default now(),
  erledigt_von uuid references auth.users (id) on delete set null,
  erledigt_name text,
  punkte jsonb not null default '[]'::jsonb,
  fotos text[] not null default '{}',
  notiz text,
  -- „nicht in Ordnung“ → Vorgang; bei TEO-Plänen → automatisch angelegte Anfrage
  vorgang_id uuid references public.leads (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists teo_plan_erledigungen_plan_idx on public.teo_plan_erledigungen (plan_id, faellig_am desc);

alter table public.teo_anlagen enable row level security;
alter table public.teo_plaene enable row level security;
alter table public.teo_plan_erledigungen enable row level security;
create policy teo_anlagen_service on public.teo_anlagen for all to service_role using (true) with check (true);
create policy teo_plaene_service on public.teo_plaene for all to service_role using (true) with check (true);
create policy teo_plan_erledigungen_service on public.teo_plan_erledigungen for all to service_role using (true) with check (true);
