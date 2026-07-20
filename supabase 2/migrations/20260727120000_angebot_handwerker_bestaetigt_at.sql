-- Partner-Bestätigungszeitpunkt (neuer Leistungen-Tab)
ALTER TABLE angebot_handwerker
  ADD COLUMN IF NOT EXISTS bestaetigt_at timestamptz;

COMMENT ON COLUMN angebot_handwerker.bestaetigt_at IS
  'Zeitpunkt der Partner-Bestätigung nach CRM-Freigabe (neuer Koordinations-Flow).';
