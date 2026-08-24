-- Optionaler Empfänger-Ansprechpartner je Rechnung (Wizard-Auswahl).

alter table public.rechnungen
  add column if not exists ansprechpartner_id uuid
    references public.kunden_ansprechpartner (id) on delete set null;

create index if not exists rechnungen_ansprechpartner_id_idx
  on public.rechnungen (ansprechpartner_id)
  where ansprechpartner_id is not null;

comment on column public.rechnungen.ansprechpartner_id is
  'Optionaler Ansprechpartner für Empfängeradresse, Anrede und Versand-Mail. Null = Hauptkontakt / Primär.';
