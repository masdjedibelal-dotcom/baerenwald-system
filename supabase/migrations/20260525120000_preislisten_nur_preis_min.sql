-- Preisliste: nur noch ein Preis (preis_min). preis_max entfällt.
UPDATE preislisten
SET preis_min = COALESCE(NULLIF(preis_min, 0), preis_max, 0)
WHERE COALESCE(preis_min, 0) = 0 AND COALESCE(preis_max, 0) > 0;

ALTER TABLE preislisten DROP COLUMN IF EXISTS preis_max;
