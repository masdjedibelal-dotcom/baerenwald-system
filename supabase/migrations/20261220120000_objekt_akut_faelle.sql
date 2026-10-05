-- Sofortmaßnahme-Fälle je Objekt (05.10.2026): null = von der Hausverwaltung übernehmen.
alter table public.kunden_objekte
  add column if not exists akut_fall_ids jsonb;
comment on column public.kunden_objekte.akut_fall_ids is
  'Eigene Sofortmaßnahme-Fälle des Objekts (Liste von Fall-IDs); null = Einstellung der Hausverwaltung gilt.';
