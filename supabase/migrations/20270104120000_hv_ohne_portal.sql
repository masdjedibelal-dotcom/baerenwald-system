-- Hausverwaltung ohne Portal: alles per E-Mail möglich.
-- 1) Freigabe über der Grenze per Mail-Link (ohne Login) — geheimer Schlüssel je Vorgang.
-- 2) Arbeitsplatz und QR-Mieter-Meldung je Verwaltung einzeln schaltbar, neu standardmäßig aus.
--    Bestehende Organisationen behalten beides (kein Bruch für laufende Kunden).

alter table public.leads
  add column if not exists freigabe_token text;

create unique index if not exists leads_freigabe_token_uq
  on public.leads (freigabe_token)
  where freigabe_token is not null;

alter table public.kunden
  add column if not exists arbeitsplatz_aktiv boolean not null default false,
  add column if not exists melde_qr_aktiv boolean not null default false;

update public.kunden
set arbeitsplatz_aktiv = true,
    melde_qr_aktiv = true
where portal_modus = 'organisation';
