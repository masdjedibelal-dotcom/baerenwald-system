-- Alle Rechnungs-Migrationen in einem Durchlauf (Supabase → SQL Editor).
-- Reihenfolge entspricht den npm-Skripten db:rechnungen-*.

-- 1) Compliance (§13b, Gutschrift, generate_beleg_nummer)
alter table public.kunden
  add column if not exists ust_id text;

alter table public.rechnungen
  add column if not exists beleg_typ text not null default 'rechnung';

alter table public.rechnungen
  add column if not exists bezug_rechnung_id uuid references public.rechnungen (id) on delete set null;

alter table public.rechnungen
  add column if not exists reverse_charge_13b boolean not null default false;

alter table public.rechnungen
  add column if not exists mwst_aufschluesselung jsonb not null default '[]'::jsonb;

comment on column public.rechnungen.beleg_typ is 'rechnung | gutschrift';
comment on column public.rechnungen.bezug_rechnung_id is 'Bei Gutschrift: Referenz auf Originalrechnung';

-- 2) Rechnungsnummern RE2026-2066+ …
create or replace function public.generate_beleg_nummer(p_typ text default 'rechnung')
returns text
language plpgsql
as $$
declare
  jahr text;
  prefix text;
  start_num int;
  max_num int;
  next_num int;
begin
  jahr := to_char(now(), 'YYYY');

  if coalesce(p_typ, 'rechnung') = 'gutschrift' then
    prefix := 'GS-RE' || jahr || '-';
  else
    prefix := 'RE' || jahr || '-';
  end if;

  start_num := case when jahr = '2026' then 2066 else 1 end;

  select coalesce(
    max(substring(rechnungsnummer from char_length(prefix) + 1)::int),
    0
  )
  into max_num
  from public.rechnungen
  where rechnungsnummer like prefix || '%'
    and substring(rechnungsnummer from char_length(prefix) + 1) ~ '^[0-9]+$';

  next_num := greatest(max_num + 1, start_num);

  return prefix || next_num::text;
end;
$$;

create or replace function public.generate_rechnungsnummer()
returns text
language sql
as $$
  select public.generate_beleg_nummer('rechnung');
$$;

-- 3) Startnummer 2026 → RE2026-2069
create or replace function public.generate_beleg_nummer(p_typ text default 'rechnung')
returns text
language plpgsql
as $$
declare
  jahr text;
  prefix text;
  start_num int;
  max_num int;
  next_num int;
begin
  jahr := to_char(now(), 'YYYY');

  if coalesce(p_typ, 'rechnung') = 'gutschrift' then
    prefix := 'GS-RE' || jahr || '-';
  else
    prefix := 'RE' || jahr || '-';
  end if;

  start_num := case when jahr = '2026' then 2069 else 1 end;

  select coalesce(
    max(substring(rechnungsnummer from char_length(prefix) + 1)::int),
    0
  )
  into max_num
  from public.rechnungen
  where rechnungsnummer like prefix || '%'
    and substring(rechnungsnummer from char_length(prefix) + 1) ~ '^[0-9]+$';

  next_num := greatest(max_num + 1, start_num);

  return prefix || next_num::text;
end;
$$;

comment on function public.generate_beleg_nummer(text) is
  'Fortlaufende Belegnummer: RE{Jahr}-{Nr} ab 2069 in 2026, Gutschrift GS-RE{Jahr}-{Nr}';

-- 4) PDF-Texte
alter table public.rechnungen
  add column if not exists einleitung text;

alter table public.rechnungen
  add column if not exists hinweise text;

-- 5) Zahlungsplan / Abschlagsrechnungen
alter table public.angebote
  add column if not exists zahlungsplan jsonb;

alter table public.auftraege
  add column if not exists zahlungsplan jsonb;

alter table public.rechnungen
  add column if not exists rechnung_art text not null default 'voll',
  add column if not exists abschlag_index int,
  add column if not exists zahlungsplan_abschlag_id text,
  add column if not exists mail_einleitung text,
  add column if not exists mail_betreff text;

-- 6) Zahlungsbedingungen
alter table public.rechnungen
  add column if not exists zahlungsbedingungen text;

-- 7) § 35a optional
alter table public.rechnungen
  add column if not exists hinweis_35a boolean;
