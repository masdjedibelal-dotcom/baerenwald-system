-- Abschlussdokumentation: PDF-URL für Kundenportal (nach Versand per E-Mail)

alter table public.auftraege
  add column if not exists abschlussdokumentation_url text,
  add column if not exists abschlussdokumentation_gesendet_at timestamptz;

comment on column public.auftraege.abschlussdokumentation_url is
  'Öffentliche PDF-URL der Abschlussdokumentation (Bucket protokolle) — Kundenportal Dokumente';
comment on column public.auftraege.abschlussdokumentation_gesendet_at is
  'Zeitpunkt Versand Abschlussdokumentation an Kunden';
