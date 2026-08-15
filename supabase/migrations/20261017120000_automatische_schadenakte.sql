-- Parity: Automatische Schadenakte (Objekt-Schalter + Lead-PDF-URL)

alter table public.kunden_objekte
  add column if not exists automatische_schadenakte boolean not null default false;

comment on column public.kunden_objekte.automatische_schadenakte is
  'Wenn true: Mieter-/Schadensmeldungen setzen Kostenträger Versicherung und erzeugen/aktualisieren die Schadenakte.';

alter table public.leads
  add column if not exists versicherungsakte_pdf_url text;

comment on column public.leads.versicherungsakte_pdf_url is
  'Schadenakte Versicherung (PDF-URL), auch ohne Auftrag verfügbar.';
