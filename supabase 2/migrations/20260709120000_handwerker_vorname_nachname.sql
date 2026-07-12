-- Handwerker: Geschäftsführer Vor-/Nachname getrennt vom Firmennamen
alter table public.handwerker
  add column if not exists vorname text,
  add column if not exists nachname text;

comment on column public.handwerker.vorname is 'Vorname Geschäftsführer / Ansprechpartner';
comment on column public.handwerker.nachname is 'Nachname Geschäftsführer / Ansprechpartner';

-- Bestehende Datensätze: name war oft GF, firma der Firmenname
update public.handwerker
set
  vorname = case
    when position(' ' in trim(name)) > 0 then split_part(trim(name), ' ', 1)
    else trim(name)
  end,
  nachname = case
    when position(' ' in trim(name)) > 0 then trim(substring(trim(name) from position(' ' in trim(name)) + 1))
    else null
  end
where
  firma is not null
  and trim(firma) <> ''
  and trim(name) is not null
  and trim(name) <> ''
  and trim(name) <> trim(firma)
  and vorname is null
  and nachname is null;

-- Nur Personenname in name, kein Firmenfeld
update public.handwerker
set
  vorname = case
    when position(' ' in trim(name)) > 0 then split_part(trim(name), ' ', 1)
    else trim(name)
  end,
  nachname = case
    when position(' ' in trim(name)) > 0 then trim(substring(trim(name) from position(' ' in trim(name)) + 1))
    else null
  end
where
  (firma is null or trim(firma) = '')
  and trim(name) is not null
  and trim(name) <> ''
  and vorname is null
  and nachname is null;

-- Firmenname nur in name → nach firma übernehmen
update public.handwerker
set firma = trim(name)
where (firma is null or trim(firma) = '') and trim(name) <> '';

-- Kanonisches name-Feld: Firma vor Person (wie Gewerbekunden)
update public.handwerker
set name = coalesce(
  nullif(trim(firma), ''),
  nullif(trim(concat_ws(' ', vorname, nachname)), ''),
  trim(name)
)
where true;
