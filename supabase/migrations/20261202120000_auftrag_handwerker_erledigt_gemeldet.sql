-- Partner meldet Auftrag erledigt (ohne Abnahme) — CRM-Glocke hw_auftrag_erledigt

alter table public.auftrag_handwerker
  add column if not exists erledigt_gemeldet_am timestamptz;

comment on column public.auftrag_handwerker.erledigt_gemeldet_am is
  'Zeitpunkt, zu dem der Partner den Auftrag als erledigt gemeldet hat (ohne Abnahme).';

create index if not exists auftrag_handwerker_erledigt_gemeldet_idx
  on public.auftrag_handwerker (erledigt_gemeldet_am desc nulls last)
  where erledigt_gemeldet_am is not null;
