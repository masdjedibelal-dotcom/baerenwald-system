-- Partner-Portal: Handwerker reicht Preis + Angebots-PDF ein

alter table public.angebot_handwerker
  add column if not exists hw_preis_netto numeric,
  add column if not exists hw_preis_brutto numeric,
  add column if not exists hw_angebot_pdf_url text,
  add column if not exists hw_eingereicht_at timestamptz,
  add column if not exists hw_status text,
  add column if not exists hw_notiz text;

comment on column public.angebot_handwerker.hw_preis_netto is 'Vom Handwerker eingereicht (netto)';
comment on column public.angebot_handwerker.hw_preis_brutto is 'Vom Handwerker eingereicht (brutto)';
comment on column public.angebot_handwerker.hw_angebot_pdf_url is 'PDF-URL (Storage handwerker-uploads)';
comment on column public.angebot_handwerker.hw_eingereicht_at is 'Zeitpunkt Einreichung durch Handwerker';
comment on column public.angebot_handwerker.hw_status is 'offen | eingereicht | abgelehnt | uebernommen';
comment on column public.angebot_handwerker.hw_notiz is 'Optionale Notiz des Handwerkers';

-- Portal darf hw_* bei eigener Zeile setzen (nach Annahme)
drop policy if exists "angebot_handwerker_portal_update" on public.angebot_handwerker;
create policy "angebot_handwerker_portal_update"
  on public.angebot_handwerker for update to authenticated
  using (handwerker_id = public.portal_handwerker_id())
  with check (handwerker_id = public.portal_handwerker_id());
