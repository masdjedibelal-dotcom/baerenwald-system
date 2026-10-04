-- Regie aus dem CRM eintragen: Stundensatz zur Regie-Meldung (Beschreibung + Stunden gab es schon).
alter table public.einsatz_mitteilungen
  add column if not exists stundensatz numeric(10, 2);
