-- Partner-Portal: Konditionen je Leistung (HW bestätigt oder Gegenvorschlag)

alter table public.angebot_handwerker
  add column if not exists hw_konditionen jsonb;

comment on column public.angebot_handwerker.hw_konditionen is
  'HW-Konditionen: { art: bestaetigt|gegenvorschlag, positionen: [{ position_id, leistung, ek_netto, hw_netto, mwst_satz, geaendert }], eingereicht_at }';
