-- Einmal im Supabase SQL Editor ausführen (alle fehlenden kunden-Spalten + Schema-Reload)
-- Reihenfolge egal dank IF NOT EXISTS

-- Stammdaten-Erweiterung (20260421140000)
alter table public.kunden add column if not exists ansprechpartner text;
alter table public.kunden add column if not exists webseite text;
alter table public.kunden add column if not exists geburtstag date;
alter table public.kunden add column if not exists kundennummer text;
alter table public.kunden add column if not exists quelle text;
alter table public.kunden add column if not exists gesamt_umsatz numeric(12, 2) not null default 0;
alter table public.kunden add column if not exists letzte_aktivitaet timestamptz;
alter table public.kunden add column if not exists updated_at timestamptz not null default now();

-- Adresse strukturiert (20260520153000)
alter table public.kunden add column if not exists vorname text;
alter table public.kunden add column if not exists nachname text;
alter table public.kunden add column if not exists strasse text;
alter table public.kunden add column if not exists hausnummer text;

-- Rechnungen / Gewerbe (20260521120000)
alter table public.kunden add column if not exists ust_id text;

-- PostgREST / API Schema-Cache aktualisieren (Supabase)
notify pgrst, 'reload schema';
