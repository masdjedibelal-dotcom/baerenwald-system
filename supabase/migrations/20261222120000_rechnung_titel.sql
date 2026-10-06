-- Titel der Rechnung aus dem Wizard (bisher nicht gespeichert → PDF nahm immer Angebots-/Auftragstitel).
-- Storno-Gutschrift: fester Titel „Stornorechnung zu RE…“; Korrektur übernimmt den Titel des Originals.
alter table public.rechnungen add column if not exists titel text;
comment on column public.rechnungen.titel is 'Titel aus dem Rechnungs-Wizard; null = Titel aus Angebot/Auftrag.';
