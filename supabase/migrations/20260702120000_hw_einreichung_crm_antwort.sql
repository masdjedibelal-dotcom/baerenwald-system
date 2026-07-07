-- CRM-Antwort auf Handwerker-Einreichung (Annehmen / Rückfrage / Ablehnen)
ALTER TABLE public.angebot_handwerker
  ADD COLUMN IF NOT EXISTS hw_crm_notiz text,
  ADD COLUMN IF NOT EXISTS hw_crm_antwort_at timestamptz;

COMMENT ON COLUMN public.angebot_handwerker.hw_status IS
  'Einreichung: offen | eingereicht | uebernommen | abgelehnt | rueckfrage';
