alter table public.rechnungen
  add column if not exists zahlungsbedingungen text;

comment on column public.rechnungen.zahlungsbedingungen is
  'Zahlungsbedingungen auf der Rechnung (Standard-Text oder Abschlagsplan)';
