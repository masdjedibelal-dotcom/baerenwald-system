-- Ausführungsstatus pro Leistung (Fortschritt wird preisgewichtet berechnet)

alter table public.auftrag_positionen
  add column if not exists leistung_status text default 'offen';

comment on column public.auftrag_positionen.leistung_status is 'offen | in_arbeit | erledigt — preisgewichteter Fortschritt';
