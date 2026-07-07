-- Pro Auftrag/Handwerker: vom CRM gewählte Pflicht-Unterlagen (Leistungsebene)

alter table public.auftrag_handwerker
  add column if not exists compliance_pflicht_slugs text[] default null;

comment on column public.auftrag_handwerker.compliance_pflicht_slugs is
  'Vom CRM beim Nachunternehmervertrag-Wizard gewählte Leistungs-Unterlagen (Slugs). NULL = Legacy-Automatik.';
