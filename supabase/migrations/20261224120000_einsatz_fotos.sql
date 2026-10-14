-- Einsatz: Fotos zur Anweisung (von Bärenwald beim Delegieren angehängt).
-- Öffentliche Links aus dem Bucket „protokolle“ (wie Tagebuch-Fotos) — Mail, WhatsApp und Portal zeigen sie direkt.
alter table public.einsaetze add column if not exists anweisung_fotos jsonb not null default '[]'::jsonb;
comment on column public.einsaetze.anweisung_fotos is 'Fotos zur Anweisung: Liste öffentlicher Bild-URLs (Bucket protokolle, <auftrag>/einsatz/…).';
