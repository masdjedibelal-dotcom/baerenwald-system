-- Partner-Rechnung am Einsatz: nur PDF-Upload, im CRM als bezahlt markierbar (04.10.2026).
alter table public.einsaetze
  add column if not exists rechnung_bezahlt_at timestamptz;

comment on column public.einsaetze.rechnung_bezahlt_at is
  'Partner-Rechnung zum Einsatz bezahlt (im CRM in den Vorgangs-Dokumenten markiert).';
