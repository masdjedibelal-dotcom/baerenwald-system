-- Gruppierung in der Handwerker-Compliance-Ansicht (z. B. „Steuern“, „Versicherung“)
alter table public.compliance_dokument_typen
  add column if not exists kategorie text;

comment on column public.compliance_dokument_typen.kategorie is 'Optional: Überschrift für Gruppen in der Compliance-Liste; leer = Fallback nach Pflicht/Weitere';
