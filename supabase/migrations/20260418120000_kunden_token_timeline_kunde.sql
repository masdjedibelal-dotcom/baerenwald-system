-- Kunden-Link (öffentliche Status-Seite) + Freigabe-Flags für Timeline
-- Hinweis: Öffentlicher Zugriff erfolgt in der App serverseitig (Service Role) mit Token in der URL.
-- Kein blanket SELECT für anon auf gesamte auftraege (Token-Raten).

alter table public.auftraege
  add column if not exists kunden_token text;

update public.auftraege
set kunden_token = encode(gen_random_bytes(32), 'hex')
where kunden_token is null;

create unique index if not exists auftraege_kunden_token_unique
  on public.auftraege (kunden_token);

comment on column public.auftraege.kunden_token is 'Geheimer Link-Schlüssel für /projekt/[token] (ohne Login)';

alter table public.auftrag_timeline
  add column if not exists fuer_kunde_freigegeben boolean not null default false;

alter table public.auftrag_timeline
  add column if not exists freigegeben_at timestamptz;

comment on column public.auftrag_timeline.fuer_kunde_freigegeben is 'true = Eintrag auf Kunden-Status-Seite sichtbar';
comment on column public.auftrag_timeline.freigegeben_at is 'Zeitpunkt der Freigabe für Kundin';
