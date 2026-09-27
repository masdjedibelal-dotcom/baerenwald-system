-- Claim-Stempel gegen Doppelversand Regie-Mails (Partner / Kunde).
-- Pattern wie erinnerung_7_sent_at: bedingtes UPDATE … IS NULL vor sendMail.

ALTER TABLE public.auftrag_positionen
  ADD COLUMN IF NOT EXISTS regie_mail_partner_at timestamptz null,
  ADD COLUMN IF NOT EXISTS regie_mail_kunde_at timestamptz null;

COMMENT ON COLUMN public.auftrag_positionen.regie_mail_partner_at IS
  'Zeitstempel Partner-Mail bei Regie-Entscheidung; NULL = noch nicht versendet (Claim-Spalte).';

COMMENT ON COLUMN public.auftrag_positionen.regie_mail_kunde_at IS
  'Zeitstempel Kunden-Informationsmail bei angenommener Regie; NULL = noch nicht versendet (Claim-Spalte).';
