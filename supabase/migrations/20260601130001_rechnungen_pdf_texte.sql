-- Einleitung / Hinweise aus Rechnungs-Wizard für PDF

alter table public.rechnungen
  add column if not exists einleitung text;

alter table public.rechnungen
  add column if not exists hinweise text;

comment on column public.rechnungen.einleitung is 'Fließtext nach Anrede im Rechnungs-PDF';
comment on column public.rechnungen.hinweise is 'Zusätzliche Absätze vor Zahlungshinweis (Rechnungs-PDF)';
