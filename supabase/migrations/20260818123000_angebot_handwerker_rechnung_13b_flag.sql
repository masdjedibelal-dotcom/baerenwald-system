-- Handwerker-Zuweisung: 13b-Schalter für automatische Eingangsrechnung.
alter table public.angebot_handwerker
  add column if not exists hw_rechnung_reverse_charge_13b boolean not null default false;

comment on column public.angebot_handwerker.hw_rechnung_reverse_charge_13b is
  'Wenn true, wird bei der automatisch erzeugten Partner-Eingangsrechnung reverse_charge_13b gesetzt.';
