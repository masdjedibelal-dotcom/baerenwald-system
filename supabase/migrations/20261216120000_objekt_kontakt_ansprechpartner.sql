-- Personen am Objekt: Funktion „Ansprechpartner“ (eine Liste für Hausmeister und Ansprechpartner).
alter table public.objekt_kontakte drop constraint if exists objekt_kontakte_rolle_check;
alter table public.objekt_kontakte
  add constraint objekt_kontakte_rolle_check
  check (rolle in ('hausmeister', 'ansprechpartner', 'beirat', 'dienstleister', 'notfall', 'makler', 'sonstiges'));
