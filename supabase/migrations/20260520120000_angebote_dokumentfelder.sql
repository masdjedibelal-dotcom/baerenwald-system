-- Angebotsdokument: Nummer, Leistungsumfang, Einleitung, Zahlungsbedingungen (Text), Hinweise, Gültigkeit
alter table public.angebote
  add column if not exists angebotsnr text;

alter table public.angebote
  add column if not exists leistungsumfang text;

alter table public.angebote
  add column if not exists einleitung text;

alter table public.angebote
  add column if not exists zahlungsbedingungen text default 'sofort_netto';

alter table public.angebote
  add column if not exists hinweise text;

alter table public.angebote
  add column if not exists gueltig_bis date;

comment on column public.angebote.angebotsnr is 'Fortlaufende Angebotsnummer z.B. AG250001';

create index if not exists idx_angebote_angebotsnr on public.angebote (angebotsnr);
