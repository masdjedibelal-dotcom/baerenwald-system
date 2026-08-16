-- CRM: Bewohner → Privatkunde nutzt einheit_bewohner.portal_kunde_id (bereits vorhanden).
-- Index für Rückwärtssuche auf Kunden-Detail.

create index if not exists einheit_bewohner_portal_kunde_id_idx
  on public.einheit_bewohner (portal_kunde_id)
  where portal_kunde_id is not null;

comment on column public.einheit_bewohner.portal_kunde_id is
  'Verknüpfter Privatkunde (CRM-Stamm und/oder Portal-Login). Die Bewohner-Zeile bleibt Akte der HV; Phase-1-Portal bleibt HV-Kontext.';
