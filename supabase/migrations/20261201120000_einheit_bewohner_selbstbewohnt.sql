-- Eigentümer selbstbewohnt: zählt als „bewohnt“ / erscheint in HV-Mieter-Zuordnung.
-- Nicht-selbstbewohnte Eigentümer belegen die Einheit nicht (vermietet oder leer).

alter table public.einheit_bewohner
  add column if not exists selbstbewohnt boolean not null default false;

comment on column public.einheit_bewohner.selbstbewohnt is
  'Nur Eigentümer: Wohnung selbst bewohnt → wie Mieter für Belegung & Vorgang-Zuordnung. Mieter: immer false.';

-- Mieter dürfen nicht als selbstbewohnt markiert sein
update public.einheit_bewohner
set selbstbewohnt = false
where rolle is distinct from 'eigentuemer'
  and selbstbewohnt is true;
