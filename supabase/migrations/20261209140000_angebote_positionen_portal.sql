-- Portal-Snapshot der zuletzt versendeten Positionen.
-- CRM darf positionen vor erneuter Kundenentscheidung bearbeiten;
-- Portal/Annahme nutzen positionen_portal bis zum nächsten Versand.

ALTER TABLE public.angebote
  ADD COLUMN IF NOT EXISTS positionen_portal jsonb;

COMMENT ON COLUMN public.angebote.positionen_portal IS
  'Zuletzt an Kunde/HV versendete Positionen. NULL = Legacy (positionen). Wird nur beim Versand gesetzt.';

-- Bestehende bereits versendete Angebote: aktueller Stand = letzte Fassung
UPDATE public.angebote
SET positionen_portal = positionen
WHERE positionen_portal IS NULL
  AND (
    gesendet_kunde_at IS NOT NULL
    OR gesendet_am IS NOT NULL
    OR lower(coalesce(status_einfach, '')) IN (
      'gesendet',
      'angenommen',
      'abgelehnt',
      'abgelaufen'
    )
    OR lower(coalesce(status::text, '')) IN (
      'gesendet_kunde',
      'kunde_akzeptiert',
      'kunde_abgelehnt',
      'angenommen',
      'abgelehnt'
    )
  );
