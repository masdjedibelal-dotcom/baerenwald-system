-- Einsatz-Schritte können vom Partner selbst (Portal) oder von Bärenwald im CRM
-- (nach Telefon/WhatsApp) erfasst werden. NULL = Partner (Bestand).
alter table public.einsaetze
  add column if not exists angenommen_von text check (angenommen_von in ('partner', 'bw')),
  add column if not exists fertig_von text check (fertig_von in ('partner', 'bw')),
  add column if not exists rechnung_von text check (rechnung_von in ('partner', 'bw'));

alter table public.einsatz_mitteilungen
  add column if not exists erfasst_von text check (erfasst_von in ('partner', 'bw'));
