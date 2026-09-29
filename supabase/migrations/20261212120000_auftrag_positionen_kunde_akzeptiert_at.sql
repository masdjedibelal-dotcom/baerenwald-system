-- P01: Spalte, die Kundenportal (get-portal-data, portal-auftrag) seit 2026-08 liest und schreibt.
-- Ohne sie scheitern "Leistungen im Kundenportal" und "Änderungen annehmen" bei jedem Aufruf.
alter table public.auftrag_positionen
  add column if not exists kunde_akzeptiert_at timestamptz;

comment on column public.auftrag_positionen.kunde_akzeptiert_at is
  'Zeitpunkt, zu dem der Kunde eine geänderte/neue Position im Portal angenommen hat.';
