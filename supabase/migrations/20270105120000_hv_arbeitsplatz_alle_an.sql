-- TEO: Kein Schalter „Arbeitsplatz (Login)“ / „QR-Meldung“ mehr — Zugang gilt mit der Einladung, QR-Meldung für alle an.
-- Alle bestehenden Verwaltungen bekommen Arbeitsplatz und QR-Meldung (Arbeitsplatz steuert nur noch den Portal-Hinweis in Mails).
update public.kunden
set arbeitsplatz_aktiv = true, melde_qr_aktiv = true, updated_at = now()
where portal_modus = 'organisation'
  and (arbeitsplatz_aktiv is distinct from true or melde_qr_aktiv is distinct from true);
