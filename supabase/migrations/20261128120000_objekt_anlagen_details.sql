-- Stufe 1: optionale Anlagen-Detailfelder (nur Daten, keine Automatik).

alter table public.objekt_anlagen
  add column if not exists hersteller text,
  add column if not exists modell text,
  add column if not exists seriennummer text,
  add column if not exists anschaffungswert_eur numeric(12, 2),
  add column if not exists garantie_bis date,
  add column if not exists gewaehrleistung_bis date,
  add column if not exists wartungsintervall text,
  add column if not exists letzte_wartung_am date,
  add column if not exists dokument_urls text[] not null default '{}'::text[];

comment on column public.objekt_anlagen.hersteller is 'Optional — Hersteller (Ersatzteile, Briefing).';
comment on column public.objekt_anlagen.modell is 'Optional — Modell / Typ.';
comment on column public.objekt_anlagen.seriennummer is 'Optional — Seriennummer.';
comment on column public.objekt_anlagen.anschaffungswert_eur is 'Optional — Anschaffungs-/Neuwert in EUR.';
comment on column public.objekt_anlagen.garantie_bis is 'Optional — Garantie-Ende (nur Anzeige Stufe 1).';
comment on column public.objekt_anlagen.gewaehrleistung_bis is 'Optional — Gewährleistung-Ende.';
comment on column public.objekt_anlagen.wartungsintervall is 'Optional — keins|monatlich|quartalsweise|halbjaehrlich|jaehrlich.';
comment on column public.objekt_anlagen.letzte_wartung_am is 'Optional — letzte Wartung.';
comment on column public.objekt_anlagen.dokument_urls is 'Optional — Datenblätter, Garantiescheine (URLs).';

alter table public.objekt_anlagen
  drop constraint if exists objekt_anlagen_wartungsintervall_check;

alter table public.objekt_anlagen
  add constraint objekt_anlagen_wartungsintervall_check
  check (
    wartungsintervall is null
    or wartungsintervall in (
      'keins',
      'monatlich',
      'quartalsweise',
      'halbjaehrlich',
      'jaehrlich'
    )
  );
