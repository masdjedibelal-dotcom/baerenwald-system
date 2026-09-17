-- F-160: Gesendete Rechnungen ohne Angebotstitel — Default aus Auftragstitel nachziehen.
UPDATE angebote a
SET leistungsumfang = NULLIF(trim(auf.titel), '')
FROM rechnungen r
JOIN auftraege auf ON auf.id = r.auftrag_id
WHERE r.angebot_id = a.id
  AND r.status IN ('gesendet', 'bezahlt', 'ueberfaellig')
  AND COALESCE(NULLIF(trim(a.leistungsumfang), ''), '') = ''
  AND COALESCE(NULLIF(trim(auf.titel), ''), '') <> '';
