-- Partner-Eingangsrechnung: Zahlungsstatus an angebot_handwerker (kein CRM-rechnungen-Datensatz)

alter table public.angebot_handwerker
  add column if not exists hw_rechnung_status text,
  add column if not exists hw_rechnung_bezahlt_at timestamptz,
  add column if not exists hw_rechnung_betrag_brutto numeric(12, 2);

comment on column public.angebot_handwerker.hw_rechnung_status is
  'Eingangsrechnung: eingereicht | bezahlt | abgelehnt (NULL = eingereicht wenn PDF vorhanden)';
comment on column public.angebot_handwerker.hw_rechnung_bezahlt_at is
  'Zeitpunkt CRM „als bezahlt markiert“';
comment on column public.angebot_handwerker.hw_rechnung_betrag_brutto is
  'Optionaler Rechnungsbetrag Brutto; sonst Fallback hw_preis_brutto';

-- Bestehende Uploads als eingereicht markieren
update public.angebot_handwerker
set hw_rechnung_status = 'eingereicht'
where hw_rechnung_pdf_url is not null
  and nullif(trim(hw_rechnung_pdf_url), '') is not null
  and (hw_rechnung_status is null or trim(hw_rechnung_status) = '');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'angebot_handwerker_hw_rechnung_status_check'
  ) then
    alter table public.angebot_handwerker
      add constraint angebot_handwerker_hw_rechnung_status_check
      check (
        hw_rechnung_status is null
        or hw_rechnung_status in ('eingereicht', 'bezahlt', 'abgelehnt')
      );
  end if;
end $$;

create index if not exists angebot_handwerker_hw_rechnung_eingang_idx
  on public.angebot_handwerker (hw_rechnung_eingereicht_at desc nulls last)
  where hw_rechnung_pdf_url is not null;
