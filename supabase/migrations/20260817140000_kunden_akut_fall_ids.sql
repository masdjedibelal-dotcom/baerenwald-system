-- HV Sofortmaßnahme: ausgewählte Fall-IDs (leer = nichts geht direkt)
alter table public.kunden
  add column if not exists akut_fall_ids jsonb not null default '[]'::jsonb;

comment on column public.kunden.akut_fall_ids is
  'Whitelist Sofortmaßnahme-Fall-IDs (Portal-Katalog). Leer = kein Direktauftrag.';
