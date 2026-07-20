-- E-Mail-Duplikate auf kunden wieder erlauben (z. B. mehrere Hausverwaltungen / geteilte Kontakt-Mail).
-- Unique-Index stammt aus handwerks-plattform/20260609120000_kunden_email_unique.sql

drop index if exists public.kunden_email_unique_lower_idx;

-- Nicht-eindeutiger Index für Suche bleibt (falls nur der Unique-Index existierte)
create index if not exists kunden_email_idx on public.kunden (email);

comment on column public.kunden.email is
  'Kontakt-E-Mail (Duplikate erlaubt). Portal-Login bleibt über auth_user_id eindeutig.';
