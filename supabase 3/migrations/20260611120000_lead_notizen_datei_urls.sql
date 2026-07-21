-- Mehrere Fotos pro Lead-Notiz (Termin-Notizen: bis zu 15 Bilder)

alter table public.lead_notizen
  add column if not exists datei_urls text[] default null;

comment on column public.lead_notizen.datei_urls is 'Mehrere Bild-URLs (z. B. Termin-Notizen)';

update public.lead_notizen
set datei_urls = array[datei_url]
where datei_url is not null
  and trim(datei_url) <> ''
  and (datei_urls is null or cardinality(datei_urls) = 0);
