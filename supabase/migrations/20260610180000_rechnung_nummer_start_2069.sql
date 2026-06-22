-- Nächste Rechnungsnummer in 2026 ab RE2026-2069 (vorher Start 2066)

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
