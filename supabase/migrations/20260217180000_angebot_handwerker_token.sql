-- Token für öffentliche Handwerker-Anfrage-Links + Antwort-Zeitstempel
--
-- Hinweis Sicherheit: Kein breites RLS „WHERE token IS NOT NULL“ für anon — das würde alle
-- Zeilen mit Token lesbar machen. Öffentliche Seite nutzt ausschließlich API-Routen mit
-- Service Role und geheimem Token in der URL.

alter table public.angebote
  add column if not exists gesendet_kunde_at timestamptz;

alter table public.angebot_handwerker
  add column if not exists token text;

alter table public.angebot_handwerker
  add column if not exists gesendet_at timestamptz;

alter table public.angebot_handwerker
  add column if not exists antwort_at timestamptz;

alter table public.angebot_handwerker
  add column if not exists antwort_notiz text;

-- Einmalige Tokens für bestehende Zeilen
update public.angebot_handwerker
set token = encode(gen_random_bytes(32), 'hex')
where token is null;

alter table public.angebot_handwerker
  alter column token set default encode(gen_random_bytes(32), 'hex');

drop index if exists angebot_handwerker_token_unique;
create unique index angebot_handwerker_token_unique on public.angebot_handwerker (token);

alter table public.angebot_handwerker
  alter column token set not null;

comment on column public.angebot_handwerker.token is 'Geheimer Pfad-Segment für /handwerker/anfrage/[token]';

-- E-Mail-Protokoll (optional, für CRM-Auswertung)
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  typ text not null,
  angebot_id uuid references public.angebote (id) on delete set null,
  zuweisung_id uuid references public.angebot_handwerker (id) on delete set null,
  to_email text,
  subject text,
  meta jsonb,
  created_at timestamptz default now()
);

alter table public.email_logs enable row level security;

drop policy if exists "email_logs_auth_all" on public.email_logs;
create policy "email_logs_auth_all"
  on public.email_logs
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
