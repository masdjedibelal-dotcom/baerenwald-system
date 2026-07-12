-- =============================================================================
-- CRM: Test-Vorgänge löschen (Supabase SQL Editor)
-- =============================================================================
-- Erkennt E2E-/Demo-Daten an E-Mail- und Namensmustern.
--
-- Ablauf:
--   1) Abschnitt „VORSCHAU“ ausführen
--   2) Abschnitt „LÖSCHEN“ ausführen (BEGIN … COMMIT)
-- =============================================================================

CREATE OR REPLACE FUNCTION pg_temp.is_test_email(p_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_email, '') ~* '^(e2e-|.*@example\.com$|.*@baerenwald-test\.local$|.*@beispiel\.de$|.*@demo\.de$)'
$$;

CREATE OR REPLACE FUNCTION pg_temp.is_test_handwerker(p_name text, p_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT pg_temp.is_test_email(p_email)
      OR COALESCE(p_name, '') ~* '^(E2E |Demo )'
$$;

CREATE OR REPLACE FUNCTION pg_temp.is_test_lead_name(p_name text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_name, '') ~* '^(E2E |RLS Test|Dup [AB]|Ohne Foto|Musterverwaltung GmbH$)'
$$;

-- ---------------------------------------------------------------------------
-- VORSCHAU
-- ---------------------------------------------------------------------------
WITH test_kunden AS (
  SELECT id, name, email FROM kunden WHERE pg_temp.is_test_email(email)
),
test_leads AS (
  SELECT DISTINCT l.id
  FROM leads l
  LEFT JOIN kunden k ON k.id = l.kunde_id
  LEFT JOIN kunden ak ON ak.id = l.auftraggeber_kunde_id
  LEFT JOIN kunden_objekte ko ON ko.id = l.kunde_objekt_id
  WHERE l.kunde_id IN (SELECT id FROM test_kunden)
     OR l.auftraggeber_kunde_id IN (SELECT id FROM test_kunden)
     OR ko.kunde_id IN (SELECT id FROM test_kunden)
     OR pg_temp.is_test_email(l.kontakt_email)
     OR pg_temp.is_test_email(l.melder_email)
     OR pg_temp.is_test_lead_name(l.kontakt_name)
     OR pg_temp.is_test_email(k.email)
     OR pg_temp.is_test_email(ak.email)
),
test_angebote AS (
  SELECT id FROM angebote
  WHERE lead_id IN (SELECT id FROM test_leads)
     OR kunde_id IN (SELECT id FROM test_kunden)
     OR kunde_objekt_id IN (
       SELECT ko.id FROM kunden_objekte ko WHERE ko.kunde_id IN (SELECT id FROM test_kunden)
     )
),
test_auftraege AS (
  SELECT id FROM auftraege
  WHERE lead_id IN (SELECT id FROM test_leads)
     OR kunde_id IN (SELECT id FROM test_kunden)
     OR angebot_id IN (SELECT id FROM test_angebote)
),
test_handwerker AS (
  SELECT id, name, email FROM handwerker
  WHERE pg_temp.is_test_handwerker(name, email)
)
SELECT 'kunden' AS tabelle, COUNT(*)::bigint AS anzahl FROM test_kunden
UNION ALL SELECT 'leads', COUNT(*) FROM test_leads
UNION ALL SELECT 'angebote', COUNT(*) FROM test_angebote
UNION ALL SELECT 'auftraege', COUNT(*) FROM test_auftraege
UNION ALL SELECT 'handwerker', COUNT(*) FROM test_handwerker
UNION ALL SELECT 'rechnungen', COUNT(*) FROM rechnungen
  WHERE kunde_id IN (SELECT id FROM test_kunden)
     OR auftrag_id IN (SELECT id FROM test_auftraege)
     OR angebot_id IN (SELECT id FROM test_angebote)
ORDER BY tabelle;

-- SELECT name, email FROM test_handwerker;

-- ---------------------------------------------------------------------------
-- LÖSCHEN — nur Abschnitt ab BEGIN bis COMMIT ausführen!
-- (Zuletzt ausgeführt: 2026-07-11 — Testdaten in Prod bereinigt)
-- ---------------------------------------------------------------------------

BEGIN;

CREATE TEMP TABLE tmp_test_kunden ON COMMIT DROP AS
SELECT id FROM kunden WHERE pg_temp.is_test_email(email);

CREATE TEMP TABLE tmp_test_leads ON COMMIT DROP AS
SELECT DISTINCT l.id
FROM leads l
LEFT JOIN kunden k ON k.id = l.kunde_id
LEFT JOIN kunden ak ON ak.id = l.auftraggeber_kunde_id
LEFT JOIN kunden_objekte ko ON ko.id = l.kunde_objekt_id
WHERE l.kunde_id IN (SELECT id FROM tmp_test_kunden)
   OR l.auftraggeber_kunde_id IN (SELECT id FROM tmp_test_kunden)
   OR ko.kunde_id IN (SELECT id FROM tmp_test_kunden)
   OR pg_temp.is_test_email(l.kontakt_email)
   OR pg_temp.is_test_email(l.melder_email)
   OR pg_temp.is_test_lead_name(l.kontakt_name)
   OR pg_temp.is_test_email(k.email)
   OR pg_temp.is_test_email(ak.email);

CREATE TEMP TABLE tmp_test_angebote ON COMMIT DROP AS
SELECT id FROM angebote
WHERE lead_id IN (SELECT id FROM tmp_test_leads)
   OR kunde_id IN (SELECT id FROM tmp_test_kunden)
   OR kunde_objekt_id IN (
     SELECT ko.id FROM kunden_objekte ko WHERE ko.kunde_id IN (SELECT id FROM tmp_test_kunden)
   );

CREATE TEMP TABLE tmp_test_auftraege ON COMMIT DROP AS
SELECT id FROM auftraege
WHERE lead_id IN (SELECT id FROM tmp_test_leads)
   OR kunde_id IN (SELECT id FROM tmp_test_kunden)
   OR angebot_id IN (SELECT id FROM tmp_test_angebote);

CREATE TEMP TABLE tmp_test_handwerker ON COMMIT DROP AS
SELECT id FROM handwerker WHERE pg_temp.is_test_handwerker(name, email);

DELETE FROM rechnungen
WHERE kunde_id IN (SELECT id FROM tmp_test_kunden)
   OR auftrag_id IN (SELECT id FROM tmp_test_auftraege)
   OR angebot_id IN (SELECT id FROM tmp_test_angebote);

DELETE FROM ki_visualisierungen
WHERE angebot_id IN (SELECT id FROM tmp_test_angebote);

DELETE FROM hw_formular_einreichungen
WHERE auftrag_id IN (SELECT id FROM tmp_test_auftraege)
   OR handwerker_id IN (SELECT id FROM tmp_test_handwerker);

DELETE FROM handwerker_vertraege
WHERE auftrag_id IN (SELECT id FROM tmp_test_auftraege)
   OR handwerker_id IN (SELECT id FROM tmp_test_handwerker);

DELETE FROM einbehalte
WHERE auftrag_id IN (SELECT id FROM tmp_test_auftraege)
   OR handwerker_id IN (SELECT id FROM tmp_test_handwerker);

DELETE FROM gewaehrleistungen
WHERE auftrag_id IN (SELECT id FROM tmp_test_auftraege)
   OR mangel_lead_id IN (SELECT id FROM tmp_test_leads)
   OR partner_id IN (SELECT id FROM tmp_test_handwerker);

DELETE FROM kalender_termine
WHERE lead_id IN (SELECT id FROM tmp_test_leads)
   OR auftrag_id IN (SELECT id FROM tmp_test_auftraege);

DELETE FROM ki_anfragen_log WHERE lead_id IN (SELECT id FROM tmp_test_leads);
DELETE FROM email_log
WHERE lead_id IN (SELECT id FROM tmp_test_leads)
   OR angebot_id IN (SELECT id FROM tmp_test_angebote)
   OR auftrag_id IN (SELECT id FROM tmp_test_auftraege);
DELETE FROM email_logs WHERE angebot_id IN (SELECT id FROM tmp_test_angebote);

DELETE FROM org_freigabe_log
WHERE lead_id IN (SELECT id FROM tmp_test_leads)
   OR angebot_id IN (SELECT id FROM tmp_test_angebote)
   OR auftraggeber_kunde_id IN (SELECT id FROM tmp_test_kunden);

DELETE FROM auftraege WHERE id IN (SELECT id FROM tmp_test_auftraege);
DELETE FROM angebote WHERE id IN (SELECT id FROM tmp_test_angebote);
DELETE FROM leads WHERE id IN (SELECT id FROM tmp_test_leads);

DELETE FROM gpt_raum_sessions WHERE kunde_id IN (SELECT id FROM tmp_test_kunden);
DELETE FROM audit_events WHERE kunde_id IN (SELECT id FROM tmp_test_kunden);
DELETE FROM kunden WHERE id IN (SELECT id FROM tmp_test_kunden);

DELETE FROM handwerker WHERE id IN (SELECT id FROM tmp_test_handwerker);

COMMIT;


-- Verbleibende Test-Leads (sollte 0 sein):
-- SELECT COUNT(*) FROM leads l WHERE pg_temp.is_test_email(l.kontakt_email) OR pg_temp.is_test_lead_name(l.kontakt_name);
