-- Notfall Direkt beauftragen: Banner-Felder am Auftrag (§4)
-- Hängt an Positions-Lebenszyklus-Migration (20260829120000).

alter table public.auftraege
  add column if not exists ist_notfall boolean not null default false,
  add column if not exists notfall_verguetung text;

alter table public.auftraege drop constraint if exists auftraege_notfall_verguetung_check;
alter table public.auftraege
  add constraint auftraege_notfall_verguetung_check
  check (
    notfall_verguetung is null
    or notfall_verguetung in ('aufwand', 'festpreis')
  );

comment on column public.auftraege.ist_notfall is
  'Notfall-Direktbeauftragung (ohne Deckel) — CRM-Banner';
comment on column public.auftraege.notfall_verguetung is
  'aufwand | festpreis — Abrechnungshinweis im Notfall-Banner';
