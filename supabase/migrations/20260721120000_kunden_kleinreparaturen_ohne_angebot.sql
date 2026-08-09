-- HV: Kleinreparaturen ohne Angebot bis zur Freigabe-Schwelle

alter table public.kunden
  add column if not exists kleinreparaturen_ohne_angebot boolean not null default false;

comment on column public.kunden.kleinreparaturen_ohne_angebot is
  'Wenn true: kleine Reparaturen bis freigabe_schwelle_eur ohne vorheriges Angebot ausführen';
