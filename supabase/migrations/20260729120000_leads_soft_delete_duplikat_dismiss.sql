-- Soft-delete + Duplikat-Band dismiss für Anfrage-⋯-Menü

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS geloescht_am timestamptz;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS duplikat_band_dismissed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.leads.geloescht_am IS
  'Soft-delete Anfrage; Listen filtern geloescht_am IS NULL; Undo setzt NULL';
COMMENT ON COLUMN public.leads.duplikat_band_dismissed IS
  'Nutzer hat Duplikat-Band geschlossen — Zusammenführen bleibt im ⋯-Menü';

CREATE INDEX IF NOT EXISTS leads_geloescht_am_idx
  ON public.leads (geloescht_am)
  WHERE geloescht_am IS NOT NULL;
