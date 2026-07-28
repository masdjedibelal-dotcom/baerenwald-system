-- Spec Welle 2 Datenmodell - idempotent, robust gegen fehlende Vorlaeufer-Migrationen.
-- Ketten-Selbstrefs, zusammengefuehrt_in, wiedervorlage_*, letzte_aktivitaet,
-- notfall_verguetung nur aufwand, Partner->Handwerker, reklamation_*.

-- 1) Anfrage: Zusammenfuehrung

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS zusammengefuehrt_in uuid;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS vorgang_phase text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS duplikat_hinweis boolean DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS wiedervorlage_datum date;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS wiedervorlage_notiz text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_zusammengefuehrt_in_fkey') THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_zusammengefuehrt_in_fkey
      FOREIGN KEY (zusammengefuehrt_in) REFERENCES public.leads (id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS leads_zusammengefuehrt_in_idx
  ON public.leads (zusammengefuehrt_in)
  WHERE zusammengefuehrt_in IS NOT NULL;

COMMENT ON COLUMN public.leads.zusammengefuehrt_in IS
  'Spec zusammengefuehrtIn - Ziel-Lead; duplikat_hinweis bleibt Vorstufe';
COMMENT ON COLUMN public.leads.vorgang_phase IS
  'CACHE only - Phase aus Existenz Angebot/Auftrag/RE ableiten, nie als einzige Quelle lesen';
COMMENT ON COLUMN public.leads.duplikat_hinweis IS
  'Vorstufe Spec-Duplikat-Band - zusammengefuehrt_in ergaenzt, ersetzt nicht';
COMMENT ON COLUMN public.leads.wiedervorlage_datum IS 'Spec Wiedervorlage Datum (Header)';
COMMENT ON COLUMN public.leads.wiedervorlage_notiz IS 'Spec Wiedervorlage Notiz';

-- 2) Wiedervorlage Angebot / Auftrag / Rechnung

ALTER TABLE public.angebote ADD COLUMN IF NOT EXISTS wiedervorlage_datum date;
ALTER TABLE public.angebote ADD COLUMN IF NOT EXISTS wiedervorlage_notiz text;
ALTER TABLE public.auftraege ADD COLUMN IF NOT EXISTS wiedervorlage_datum date;
ALTER TABLE public.auftraege ADD COLUMN IF NOT EXISTS wiedervorlage_notiz text;
ALTER TABLE public.rechnungen ADD COLUMN IF NOT EXISTS wiedervorlage_datum date;
ALTER TABLE public.rechnungen ADD COLUMN IF NOT EXISTS wiedervorlage_notiz text;

COMMENT ON COLUMN public.angebote.wiedervorlage_datum IS 'Spec Wiedervorlage Datum (Header)';
COMMENT ON COLUMN public.angebote.wiedervorlage_notiz IS 'Spec Wiedervorlage Notiz';
COMMENT ON COLUMN public.auftraege.wiedervorlage_datum IS 'Spec Wiedervorlage Datum (Header)';
COMMENT ON COLUMN public.auftraege.wiedervorlage_notiz IS 'Spec Wiedervorlage Notiz';
COMMENT ON COLUMN public.rechnungen.wiedervorlage_datum IS 'Spec Wiedervorlage Datum (Header)';
COMMENT ON COLUMN public.rechnungen.wiedervorlage_notiz IS 'Spec Wiedervorlage Notiz';

-- 3) Angebot-Ketten + Zahlplan-Vorschlag

ALTER TABLE public.angebote ADD COLUMN IF NOT EXISTS ersetzt_durch uuid;
ALTER TABLE public.angebote ADD COLUMN IF NOT EXISTS korrektur_von uuid;
ALTER TABLE public.angebote ADD COLUMN IF NOT EXISTS korrektur_art text;
ALTER TABLE public.angebote ADD COLUMN IF NOT EXISTS zahlungsplan jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'angebote_ersetzt_durch_fkey') THEN
    ALTER TABLE public.angebote
      ADD CONSTRAINT angebote_ersetzt_durch_fkey
      FOREIGN KEY (ersetzt_durch) REFERENCES public.angebote (id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'angebote_korrektur_von_fkey') THEN
    ALTER TABLE public.angebote
      ADD CONSTRAINT angebote_korrektur_von_fkey
      FOREIGN KEY (korrektur_von) REFERENCES public.angebote (id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.angebote DROP CONSTRAINT IF EXISTS angebote_korrektur_art_check;
ALTER TABLE public.angebote
  ADD CONSTRAINT angebote_korrektur_art_check
  CHECK (korrektur_art IS NULL OR korrektur_art = 'ueberarbeitet');

CREATE INDEX IF NOT EXISTS angebote_ersetzt_durch_idx
  ON public.angebote (ersetzt_durch)
  WHERE ersetzt_durch IS NOT NULL;
CREATE INDEX IF NOT EXISTS angebote_korrektur_von_idx
  ON public.angebote (korrektur_von)
  WHERE korrektur_von IS NOT NULL;

COMMENT ON COLUMN public.angebote.ersetzt_durch IS 'Spec ersetztDurch';
COMMENT ON COLUMN public.angebote.korrektur_von IS 'Spec korrekturVon';
COMMENT ON COLUMN public.angebote.korrektur_art IS 'Spec korrekturArt: ueberarbeitet';
COMMENT ON COLUMN public.angebote.zahlungsplan IS
  'Unverbindlicher Vorschlag (Spec Q2). Entscheidung im RE-Flow';

-- 4) Rechnung-Ketten + Reklamation

ALTER TABLE public.rechnungen ADD COLUMN IF NOT EXISTS beleg_typ text DEFAULT 'rechnung';
ALTER TABLE public.rechnungen ADD COLUMN IF NOT EXISTS bezug_rechnung_id uuid;
ALTER TABLE public.rechnungen ADD COLUMN IF NOT EXISTS ersetzt_durch uuid;
ALTER TABLE public.rechnungen ADD COLUMN IF NOT EXISTS korrektur_von uuid;
ALTER TABLE public.rechnungen ADD COLUMN IF NOT EXISTS korrektur_art text;
ALTER TABLE public.rechnungen ADD COLUMN IF NOT EXISTS reklamation_am date;
ALTER TABLE public.rechnungen ADD COLUMN IF NOT EXISTS reklamation_grund text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rechnungen_ersetzt_durch_fkey') THEN
    ALTER TABLE public.rechnungen
      ADD CONSTRAINT rechnungen_ersetzt_durch_fkey
      FOREIGN KEY (ersetzt_durch) REFERENCES public.rechnungen (id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rechnungen_korrektur_von_fkey') THEN
    ALTER TABLE public.rechnungen
      ADD CONSTRAINT rechnungen_korrektur_von_fkey
      FOREIGN KEY (korrektur_von) REFERENCES public.rechnungen (id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rechnungen_bezug_rechnung_id_fkey') THEN
    ALTER TABLE public.rechnungen
      ADD CONSTRAINT rechnungen_bezug_rechnung_id_fkey
      FOREIGN KEY (bezug_rechnung_id) REFERENCES public.rechnungen (id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.rechnungen DROP CONSTRAINT IF EXISTS rechnungen_korrektur_art_check;
ALTER TABLE public.rechnungen
  ADD CONSTRAINT rechnungen_korrektur_art_check
  CHECK (korrektur_art IS NULL OR korrektur_art IN ('ersetzt', 'gutschrift'));

UPDATE public.rechnungen
SET
  korrektur_von = COALESCE(korrektur_von, bezug_rechnung_id),
  korrektur_art = COALESCE(korrektur_art, 'gutschrift')
WHERE beleg_typ = 'gutschrift'
  AND bezug_rechnung_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS rechnungen_ersetzt_durch_idx
  ON public.rechnungen (ersetzt_durch)
  WHERE ersetzt_durch IS NOT NULL;
CREATE INDEX IF NOT EXISTS rechnungen_korrektur_von_idx
  ON public.rechnungen (korrektur_von)
  WHERE korrektur_von IS NOT NULL;

COMMENT ON COLUMN public.rechnungen.ersetzt_durch IS 'Spec ersetztDurch';
COMMENT ON COLUMN public.rechnungen.korrektur_von IS 'Spec korrekturVon';
COMMENT ON COLUMN public.rechnungen.korrektur_art IS 'Spec korrekturArt: ersetzt | gutschrift';
COMMENT ON COLUMN public.rechnungen.reklamation_am IS 'Spec Rate-Reklamation Datum';
COMMENT ON COLUMN public.rechnungen.reklamation_grund IS 'Spec Rate-Reklamation Grund';

-- 5) Auftrag: letzte_aktivitaet + Trigger

ALTER TABLE public.auftraege ADD COLUMN IF NOT EXISTS letzte_aktivitaet timestamptz;
ALTER TABLE public.auftraege ADD COLUMN IF NOT EXISTS zahlungsplan jsonb;

COMMENT ON COLUMN public.auftraege.letzte_aktivitaet IS
  'Spec letzteAktivitaet - persistiert beim Erledigen einer Position';
COMMENT ON COLUMN public.auftraege.zahlungsplan IS
  'DEPRECATED (Spec Q2): nicht mehr lesen. Vorschlag auf angebote.zahlungsplan';

ALTER TABLE public.auftrag_positionen ADD COLUMN IF NOT EXISTS leistung_status text;
ALTER TABLE public.auftrag_positionen ADD COLUMN IF NOT EXISTS erledigt_am timestamptz;

CREATE OR REPLACE FUNCTION public.touch_auftrag_letzte_aktivitaet_from_position()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.leistung_status IS DISTINCT FROM OLD.leistung_status
     AND NEW.leistung_status = 'erledigt'
     AND NEW.auftrag_id IS NOT NULL
  THEN
    UPDATE public.auftraege
    SET letzte_aktivitaet = COALESCE(NEW.erledigt_am, now())
    WHERE id = NEW.auftrag_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auftrag_position_letzte_aktivitaet ON public.auftrag_positionen;
CREATE TRIGGER trg_auftrag_position_letzte_aktivitaet
  AFTER UPDATE OF leistung_status ON public.auftrag_positionen
  FOR EACH ROW
  EXECUTE PROCEDURE public.touch_auftrag_letzte_aktivitaet_from_position();

-- 6) Notfall: nur Aufwand

ALTER TABLE public.auftraege ADD COLUMN IF NOT EXISTS ist_notfall boolean NOT NULL DEFAULT false;
ALTER TABLE public.auftraege ADD COLUMN IF NOT EXISTS notfall_verguetung text;

UPDATE public.auftraege
SET notfall_verguetung = 'aufwand'
WHERE ist_notfall = true
  AND (notfall_verguetung IS DISTINCT FROM 'aufwand');

UPDATE public.auftraege
SET notfall_verguetung = 'aufwand'
WHERE notfall_verguetung = 'festpreis';

ALTER TABLE public.auftraege DROP CONSTRAINT IF EXISTS auftraege_notfall_verguetung_check;
ALTER TABLE public.auftraege ALTER COLUMN notfall_verguetung SET DEFAULT 'aufwand';
ALTER TABLE public.auftraege
  ADD CONSTRAINT auftraege_notfall_verguetung_check
  CHECK (notfall_verguetung IS NULL OR notfall_verguetung = 'aufwand');

COMMENT ON COLUMN public.auftraege.ist_notfall IS 'Notfall-Direktbeauftragung ohne Deckel';
COMMENT ON COLUMN public.auftraege.notfall_verguetung IS
  'Nur aufwand (Spec Q3). Spalte bleibt fuer spaetere Erweiterung';

-- 7) Partner -> Handwerker

ALTER TABLE public.handwerker ADD COLUMN IF NOT EXISTS herkunft text;
ALTER TABLE public.handwerker ADD COLUMN IF NOT EXISTS partner_kategorie_id uuid;
ALTER TABLE public.handwerker ADD COLUMN IF NOT EXISTS subkategorie text;
ALTER TABLE public.handwerker ADD COLUMN IF NOT EXISTS webseite text;
ALTER TABLE public.handwerker ADD COLUMN IF NOT EXISTS ist_fachbetrieb boolean DEFAULT false;
ALTER TABLE public.handwerker ADD COLUMN IF NOT EXISTS firma text;
ALTER TABLE public.handwerker ADD COLUMN IF NOT EXISTS notizen text;
ALTER TABLE public.handwerker ADD COLUMN IF NOT EXISTS aktiv boolean DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'handwerker' AND column_name = 'gewerke'
  ) THEN
    ALTER TABLE public.handwerker ADD COLUMN gewerke text[] DEFAULT '{}'::text[];
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'partner_kategorien'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'handwerker_partner_kategorie_id_fkey'
  ) THEN
    ALTER TABLE public.handwerker
      ADD CONSTRAINT handwerker_partner_kategorie_id_fkey
      FOREIGN KEY (partner_kategorie_id) REFERENCES public.partner_kategorien (id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.handwerker DROP CONSTRAINT IF EXISTS handwerker_herkunft_check;
ALTER TABLE public.handwerker
  ADD CONSTRAINT handwerker_herkunft_check
  CHECK (herkunft IS NULL OR herkunft IN ('handwerker', 'partner'));

COMMENT ON COLUMN public.handwerker.herkunft IS
  'partner = aus Tabelle partner migriert; null/handwerker = nativ';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'partner'
  ) THEN
    RETURN;
  END IF;

  CREATE TABLE IF NOT EXISTS public.partner_handwerker_migration (
    partner_id uuid PRIMARY KEY,
    handwerker_id uuid NOT NULL,
    migrated_at timestamptz NOT NULL DEFAULT now()
  );

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partner_handwerker_migration_partner_id_fkey') THEN
    ALTER TABLE public.partner_handwerker_migration
      ADD CONSTRAINT partner_handwerker_migration_partner_id_fkey
      FOREIGN KEY (partner_id) REFERENCES public.partner (id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partner_handwerker_migration_handwerker_id_fkey') THEN
    ALTER TABLE public.partner_handwerker_migration
      ADD CONSTRAINT partner_handwerker_migration_handwerker_id_fkey
      FOREIGN KEY (handwerker_id) REFERENCES public.handwerker (id) ON DELETE CASCADE;
  END IF;

  ALTER TABLE public.partner_handwerker_migration ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "partner_hw_migration_auth_all" ON public.partner_handwerker_migration;
  CREATE POLICY "partner_hw_migration_auth_all"
    ON public.partner_handwerker_migration
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

  WITH to_mig AS (
    SELECT
      p.id AS partner_id,
      gen_random_uuid() AS handwerker_id,
      p.name,
      NULLIF(trim(COALESCE(p.ansprechpartner, '')), '') AS firma,
      p.email,
      p.telefon,
      p.adresse,
      p.website,
      p.notizen,
      COALESCE(p.aktiv, true) AS aktiv,
      p.subkategorie,
      p.kategorie_id
    FROM public.partner p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.partner_handwerker_migration m WHERE m.partner_id = p.id
    )
  ),
  ins AS (
    INSERT INTO public.handwerker (
      id, name, firma, email, telefon, adresse, webseite, notizen,
      aktiv, subkategorie, partner_kategorie_id, gewerke, ist_fachbetrieb, herkunft
    )
    SELECT
      t.handwerker_id, t.name, t.firma, t.email, t.telefon, t.adresse, t.website, t.notizen,
      t.aktiv, t.subkategorie, t.kategorie_id, '{}'::text[], false, 'partner'
    FROM to_mig t
    RETURNING id
  )
  INSERT INTO public.partner_handwerker_migration (partner_id, handwerker_id)
  SELECT t.partner_id, t.handwerker_id
  FROM to_mig t
  ON CONFLICT (partner_id) DO NOTHING;

  EXECUTE 'COMMENT ON TABLE public.partner_handwerker_migration IS ''Rueckholbarkeit Partner->Handwerker (Spec Q4). partner-Zeilen bleiben erhalten''';
END $$;
