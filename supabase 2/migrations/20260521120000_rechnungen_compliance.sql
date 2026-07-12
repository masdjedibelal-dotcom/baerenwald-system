-- Rechnungs-Compliance: §13b, Kleinunternehmer-Aufschlüsselung, Gutschrift, Kunden-USt-ID

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

-- Fortlaufende Nummern: BW-YYYY-NNNN (Rechnung), GS-BW-YYYY-NNNN (Gutschrift)
create or replace function public.generate_beleg_nummer(p_typ text default 'rechnung')
returns text
language plpgsql
as $$
declare
  jahr text;
  laufend int;
  prefix text;
begin
  jahr := to_char(now(), 'YYYY');
  if coalesce(p_typ, 'rechnung') = 'gutschrift' then
    prefix := 'GS-BW-' || jahr || '-';
  else
    prefix := 'BW-' || jahr || '-';
  end if;

  select coalesce(count(*)::int, 0) + 1 into laufend
  from public.rechnungen
  where rechnungsnummer like prefix || '%';

  return prefix || lpad(laufend::text, 4, '0');
end;
$$;

-- Bestehende Funktion nutzt neue Logik
create or replace function public.generate_rechnungsnummer()
returns text
language sql
as $$
  select public.generate_beleg_nummer('rechnung');
$$;
