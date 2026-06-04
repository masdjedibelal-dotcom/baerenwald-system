-- Schließt Live-Schema-Lücken auf angebot_handwerker (Token, Ablehnung, Aufgabe, Rechnung).
-- Idempotent; sicher mehrfach ausführbar.

alter table public.angebot_handwerker
  add column if not exists token text,
  add column if not exists ablehnung_grund text,
  add column if not exists aufgabe_notiz text,
  add column if not exists hw_rechnung_pdf_url text,
  add column if not exists hw_rechnung_eingereicht_at timestamptz;

update public.angebot_handwerker
set token = encode(gen_random_bytes(32), 'hex')
where token is null;

drop index if exists angebot_handwerker_token_unique;
create unique index angebot_handwerker_token_unique
  on public.angebot_handwerker (token)
  where token is not null;

comment on column public.angebot_handwerker.token is 'Geheimer Pfad-Segment für /handwerker/anfrage/[token]';
comment on column public.angebot_handwerker.ablehnung_grund is 'Auswahl bei öffentlicher Ablehnung durch Handwerker';
comment on column public.angebot_handwerker.hw_rechnung_pdf_url is 'Rechnungs-PDF (Storage handwerker-uploads)';
comment on column public.angebot_handwerker.hw_rechnung_eingereicht_at is 'Zeitpunkt Rechnungs-Upload durch Handwerker';
