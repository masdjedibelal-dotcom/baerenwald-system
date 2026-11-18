-- TEO: Kein Schalter „Arbeitsplatz (Login)“ mehr — Zugang gilt mit der Einladung.
-- Alle bestehenden Verwaltungen bekommen den Arbeitsplatz (steuert nur noch den Portal-Hinweis in Mails).
update public.kunden
set arbeitsplatz_aktiv = true, updated_at = now()
where portal_modus = 'organisation'
  and arbeitsplatz_aktiv is distinct from true;
