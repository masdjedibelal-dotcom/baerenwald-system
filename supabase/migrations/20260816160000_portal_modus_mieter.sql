-- Mieter-Portal-Stub: portal_modus = mieter (kein CRM-Kunde)
-- Eigentümer/Hausmeister waren schon erlaubt; Mieter fehlte im Check.

alter table public.kunden
  drop constraint if exists kunden_portal_modus_check;

alter table public.kunden
  add constraint kunden_portal_modus_check
  check (
    portal_modus in (
      'privat',
      'organisation',
      'eigentuemer',
      'mieter',
      'hausmeister'
    )
  );

comment on column public.kunden.portal_modus is
  'privat | organisation (HV) | eigentuemer | mieter | hausmeister — letztere drei nur Portal-Stubs, nicht CRM-Kundenliste';
