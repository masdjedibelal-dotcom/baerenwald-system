-- Etage an Einheiten (UI/CRM nutzt das Feld bereits; bisher nur Code-Fallback ohne Spalte).
alter table public.objekt_einheiten
  add column if not exists etage text;

comment on column public.objekt_einheiten.etage is
  'Optionale Etage / Lage (z. B. EG, 1. OG).';
