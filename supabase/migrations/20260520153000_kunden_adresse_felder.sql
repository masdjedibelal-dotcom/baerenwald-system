-- Strukturierte Stammdaten für Rechnungen (Vorname, Nachname, Straße, Hausnummer)
alter table public.kunden
  add column if not exists vorname text;

alter table public.kunden
  add column if not exists nachname text;

alter table public.kunden
  add column if not exists strasse text;

alter table public.kunden
  add column if not exists hausnummer text;

-- Bestehende Adresse → Straße übernehmen
update public.kunden
set
  strasse = trim(adresse)
where
  strasse is null
  and adresse is not null
  and trim(adresse) <> '';

-- Hinweis: Vorname/Nachname aus Website-Funnel korrigieren mit:
-- supabase/apply-kunden-namen-from-funnel.sql
