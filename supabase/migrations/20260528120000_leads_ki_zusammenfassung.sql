-- KI-Rechner: Lead-Verknüpfung und Vertriebs-Analyse (gleiche DB wie Website)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ki_session_id text,
  ADD COLUMN IF NOT EXISTS ki_zusammenfassung text;

ALTER TABLE ki_anfragen_log
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ki_anfragen_log_lead_id_idx
  ON ki_anfragen_log (lead_id);
