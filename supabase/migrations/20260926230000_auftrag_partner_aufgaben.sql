-- Partner-Aufgabe: Gruppierung für die Partneransicht über Auftragspositionen.
-- Grundregel: Darstellung/Überschrift — Zeiterfassung, Status, Fortschritt, Regie und
-- Abrechnung bleiben je Position (auftrag_positionen).

CREATE TABLE IF NOT EXISTS public.auftrag_partner_aufgaben (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auftrag_id uuid NOT NULL REFERENCES public.auftraege (id) ON DELETE CASCADE,
  handwerker_id uuid NOT NULL REFERENCES public.handwerker (id),
  -- Leer = Partner sieht LV-Text der verknüpften Positionen (leistung_name / beschreibung).
  titel text NULL,
  beschreibung text NULL,
  sort_order integer NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.auftrag_partner_aufgaben IS
  'Partner-Aufgabe: optionale Überschrift (Titel/Beschreibung) für eine Gruppe von Auftragspositionen. Nur Darstellung für den Partner — keine eigene Arbeitseinheit. Zeiterfassung, Status, Regie und Abrechnung bleiben je auftrag_positionen.';

COMMENT ON COLUMN public.auftrag_partner_aufgaben.titel IS
  'Partner-Titel. NULL/leer = Fallback auf LV-Texte der verknüpften Positionen.';

COMMENT ON COLUMN public.auftrag_partner_aufgaben.beschreibung IS
  'Partner-Beschreibung. NULL/leer = Fallback auf LV-Texte der verknüpften Positionen.';

COMMENT ON COLUMN public.auftrag_partner_aufgaben.handwerker_id IS
  'Partner, dem diese Aufgabe zugeordnet ist. Derselbe Partner kann mehrere Aufgaben am Auftrag haben.';

CREATE INDEX IF NOT EXISTS auftrag_partner_aufgaben_auftrag_handwerker_idx
  ON public.auftrag_partner_aufgaben (auftrag_id, handwerker_id);

ALTER TABLE public.auftrag_positionen
  ADD COLUMN IF NOT EXISTS partner_aufgabe_id uuid NULL
    REFERENCES public.auftrag_partner_aufgaben (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.auftrag_positionen.partner_aufgabe_id IS
  'Optionale Partner-Aufgabe (Gruppierung). Eine Position gehört zu höchstens einer Aufgabe. Abrechnung/Zeiterfassung bleiben an dieser Positionszeile.';

CREATE INDEX IF NOT EXISTS auftrag_positionen_partner_aufgabe_id_idx
  ON public.auftrag_positionen (partner_aufgabe_id)
  WHERE partner_aufgabe_id IS NOT NULL;
