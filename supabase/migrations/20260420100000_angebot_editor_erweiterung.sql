-- Angebote: Preistyp, Versand-Zeitstempel, Vorlagen-Referenz
alter table public.angebote
  add column if not exists preis_typ text default 'range';

comment on column public.angebote.preis_typ is 'range = Min/Max, fix = Fixpreis';

alter table public.angebote
  add column if not exists gesendet_handwerker_at timestamptz;

alter table public.angebote
  add column if not exists gesendet_kunde_at timestamptz;

alter table public.angebote
  add column if not exists vorlage_id uuid;

-- ---------------------------------------------------------------------------
create table if not exists public.angebot_vorlagen (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  beschreibung text,
  positionen jsonb not null default '[]'::jsonb,
  gesamt_min numeric(10, 2),
  gesamt_max numeric(10, 2),
  gesamt_fix numeric(10, 2),
  aktiv boolean not null default true,
  erstellt_von uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_angebot_vorlagen_aktiv on public.angebot_vorlagen (aktiv, name);

alter table public.angebote
  drop constraint if exists angebot_vorlage_fk;

alter table public.angebote
  add constraint angebot_vorlage_fk foreign key (vorlage_id) references public.angebot_vorlagen (id) on delete set null;

alter table public.angebot_vorlagen enable row level security;

drop policy if exists "angebot_vorlagen_auth_all" on public.angebot_vorlagen;
create policy "angebot_vorlagen_auth_all"
  on public.angebot_vorlagen
  for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

-- angebot_handwerker: Versand / Antwort (falls Spalten fehlen)
alter table public.angebot_handwerker
  add column if not exists gesendet_at timestamptz;

alter table public.angebot_handwerker
  add column if not exists antwort_at timestamptz;

alter table public.angebot_handwerker
  add column if not exists antwort_notiz text;
