-- Gültigkeit verlängert: Startpunkt für Erinnerungs-Mail (+7 Tage)
alter table angebote
  add column if not exists verlaengert_am timestamptz;

comment on column angebote.verlaengert_am is
  'Zuletzt Gültigkeit verlängert — Erinnerungs-Mail 7 Tage danach (wenn nachgefasst_am noch leer).';
