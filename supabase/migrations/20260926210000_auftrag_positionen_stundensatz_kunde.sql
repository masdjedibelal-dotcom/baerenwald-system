-- Kundensatz je Regie-Stunde (Partnersatz bleibt stundensatz).
-- Leer = noch nicht gesetzt; CRM-Rechnung fällt dann auf stundensatz zurück.

ALTER TABLE public.auftrag_positionen
  ADD COLUMN IF NOT EXISTS stundensatz_kunde numeric null;

COMMENT ON COLUMN public.auftrag_positionen.stundensatz_kunde IS
  'Kundensatz je Stunde (VK). stundensatz bleibt der Partnersatz (EK). NULL = noch nicht gesetzt.';
