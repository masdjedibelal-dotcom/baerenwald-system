-- P06: Ein Auftrag je Angebot (Prod 29.09.2026 geprüft: 0 Doppelte).
-- Schützt vor doppelten Aufträgen, wenn CRM und Portal gleichzeitig annehmen.
create unique index if not exists auftraege_angebot_id_unique
  on public.auftraege (angebot_id)
  where angebot_id is not null;
