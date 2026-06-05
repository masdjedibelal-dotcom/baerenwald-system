-- Rechnungen + Einstellungen + Mehrfach-Handwerker pro Gewerk (Angebot)
-- Manuell in Supabase SQL Editor ausführen, falls keine Migration-Pipeline.

-- ─── Einstellungen (Key-Value für Firmendaten & PDF) ───
create table if not exists public.einstellungen (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text,
  updated_at timestamptz default now()
);

alter table public.einstellungen enable row level security;

drop policy if exists "einstellungen_auth_all" on public.einstellungen;
create policy "einstellungen_auth_all"
  on public.einstellungen
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ─── Rechnungen ───
create table if not exists public.rechnungen (
  id uuid primary key default gen_random_uuid(),
  angebot_id uuid references public.angebote(id) on delete set null,
  auftrag_id uuid references public.auftraege(id) on delete set null,
  kunde_id uuid not null references public.kunden(id),

  rechnungsnummer text unique not null,

  status text not null default 'entwurf',

  positionen jsonb not null default '[]'::jsonb,

  lohn_netto numeric(10,2),
  material_netto numeric(10,2),
  netto numeric(10,2),
  mwst_satz numeric(4,2) default 19.00,
  mwst_betrag numeric(10,2),
  brutto numeric(10,2),

  leistungszeitraum_von date,
  leistungszeitraum_bis date,
  faellig_am date,

  pdf_url text,

  rechnungsdatum date not null default (current_date),
  gesendet_at timestamptz,
  bezahlt_at timestamptz,

  erstellt_von uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists rechnungen_kunde_id_idx on public.rechnungen(kunde_id);
create index if not exists rechnungen_auftrag_id_idx on public.rechnungen(auftrag_id);

alter table public.rechnungen enable row level security;

drop policy if exists "rechnungen_auth_all" on public.rechnungen;
create policy "rechnungen_auth_all"
  on public.rechnungen
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Fortlaufende Rechnungsnummer BW-YYYY-NNNN (laufende Nr. pro Jahr)
create or replace function public.generate_rechnungsnummer()
returns text
language plpgsql
as $$
declare
  jahr text;
  laufend int;
  nummer text;
begin
  jahr := to_char(now(), 'YYYY');
  select coalesce(count(*)::int, 0) + 1 into laufend
  from public.rechnungen
  where rechnungsnummer like 'BW-' || jahr || '-%';

  nummer := 'BW-' || jahr || '-' || lpad(laufend::text, 4, '0');
  return nummer;
end;
$$;

-- Mehrere Handwerker pro Gewerk im Angebot: eindeutige Zuordnung (Angebot + Gewerk + Handwerker)
alter table public.angebot_handwerker
  drop constraint if exists angebot_handwerker_angebot_id_gewerk_id_key;

alter table public.angebot_handwerker
  drop constraint if exists angebot_handwerker_angebot_id_gewerk_id_handwerker_id_key;

alter table public.angebot_handwerker
  add constraint angebot_handwerker_angebot_gewerk_hw_unique
  unique (angebot_id, gewerk_id, handwerker_id);

alter table public.angebot_handwerker
  add column if not exists aufgabe_notiz text;
