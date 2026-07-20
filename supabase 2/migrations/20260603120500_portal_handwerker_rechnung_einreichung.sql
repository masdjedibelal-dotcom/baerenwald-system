-- Partner-Portal: Handwerker lädt Rechnungs-PDF hoch (nach Angebotseinreichung)

alter table public.angebot_handwerker
  add column if not exists hw_rechnung_pdf_url text,
  add column if not exists hw_rechnung_eingereicht_at timestamptz;

comment on column public.angebot_handwerker.hw_rechnung_pdf_url is 'Rechnungs-PDF (Storage handwerker-uploads)';
comment on column public.angebot_handwerker.hw_rechnung_eingereicht_at is 'Zeitpunkt Rechnungs-Upload durch Handwerker';
