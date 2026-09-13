-- Nummerierte Entwürfe freigeben (Fehlversand / PDF-Nebenwirkung).
-- Offizielle RE-Nr. nur bei Versand; Entwürfe bleiben null (keine Lücken, keine Unique-Kollisionen).

update public.rechnungen
set rechnungsnummer = null,
    updated_at = now()
where lower(coalesce(status, '')) = 'entwurf'
  and coalesce(richtung, 'ausgehend') is distinct from 'eingehend'
  and rechnungsnummer is not null;
