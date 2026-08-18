-- Belegnummern erst bei Versand: Entwürfe belegen keine RE-/AG-Nummern.

alter table public.rechnungen
  alter column rechnungsnummer drop not null;

comment on column public.rechnungen.rechnungsnummer is
  'Offizielle Belegnummer (RE… / GS-RE…). Null solange Status Entwurf — Vergabe beim Versand.';

-- Bestehende Entwürfe geben die Nummer frei (nicht versendet = nicht verbraucht).
update public.rechnungen
set rechnungsnummer = null,
    updated_at = now()
where lower(coalesce(status, '')) = 'entwurf'
  and coalesce(richtung, 'ausgehend') is distinct from 'eingehend'
  and rechnungsnummer is not null;

update public.angebote
set angebotsnr = null,
    updated_at = now()
where lower(coalesce(status_einfach, status, '')) = 'entwurf'
  and angebotsnr is not null;

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
    and substring(rechnungsnummer from char_length(prefix) + 1) ~ '^[0-9]+$'
    and lower(coalesce(status, '')) is distinct from 'entwurf';

  next_num := greatest(max_num + 1, start_num);

  return prefix || next_num::text;
end;
$$;

comment on function public.generate_beleg_nummer(text) is
  'Fortlaufende Belegnummer beim Versand. Entwürfe zählen nicht (keine Lücken durch ungesendete Entwürfe).';
