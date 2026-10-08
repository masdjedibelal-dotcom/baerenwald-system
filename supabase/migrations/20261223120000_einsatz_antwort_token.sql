-- Einsatz annehmen/ablehnen direkt aus der Mail (ohne Portal-Login): geheimer Link je Einsatz.
-- Der Link öffnet eine Bestätigungsseite (/einsatz/<token>) — erst der Klick dort ändert den Status
-- (Mail-Scanner rufen Links automatisch auf).
alter table public.einsaetze add column if not exists antwort_token text;
create unique index if not exists einsaetze_antwort_token_idx on public.einsaetze (antwort_token) where antwort_token is not null;
comment on column public.einsaetze.antwort_token is 'Geheimer Link-Schlüssel: Partner nimmt den Einsatz per Mail-Link an oder lehnt ab.';
-- Laufende (noch nicht beantwortete) Einsätze nachrüsten
update public.einsaetze
  set antwort_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
  where antwort_token is null and status = 'gesendet';
