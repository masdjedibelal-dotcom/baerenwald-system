-- Freie Bautagebuch-Einträge ohne Leistungsbezug + ausgeblendete Leistungen im BT.
-- Voraussetzung: zuerst 20260829120000_position_lebenszyklus_bautagebuch.sql anwenden
-- (legt public.position_eintraege + eintrag_fotos an).

do $$
begin
  if to_regclass('public.position_eintraege') is null then
    raise exception
      'Tabelle public.position_eintraege fehlt. Bitte zuerst Migration 20260829120000_position_lebenszyklus_bautagebuch.sql ausführen, danach diese Datei erneut.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1) position_eintraege: optional ohne Position, mit auftrag_id
-- ---------------------------------------------------------------------------
alter table public.position_eintraege
  add column if not exists auftrag_id uuid references public.auftraege (id) on delete cascade;

-- Bestand: Auftrag aus Position nachziehen
update public.position_eintraege pe
set auftrag_id = ap.auftrag_id
from public.auftrag_positionen ap
where pe.position_id = ap.id
  and pe.auftrag_id is null;

alter table public.position_eintraege
  alter column position_id drop not null;

alter table public.position_eintraege
  drop constraint if exists position_eintraege_bezug_check;

alter table public.position_eintraege
  add constraint position_eintraege_bezug_check
  check (position_id is not null or auftrag_id is not null);

alter table public.position_eintraege
  drop constraint if exists position_eintraege_typ_check;

alter table public.position_eintraege
  add constraint position_eintraege_typ_check
  check (
    typ in ('start', 'fortschritt', 'ergebnis', 'weitere_arbeit', 'notiz')
  );

create index if not exists position_eintraege_auftrag_idx
  on public.position_eintraege (auftrag_id, created_at)
  where auftrag_id is not null;

comment on column public.position_eintraege.auftrag_id is
  'Auftrag-Bezug; Pflicht bei Einträgen ohne position_id (freie BT-Notiz).';
comment on column public.position_eintraege.position_id is
  'Leistungsbezug; null = freier Eintrag ohne Leistung (typ notiz).';

-- ---------------------------------------------------------------------------
-- 2) Leistungen im Bautagebuch ausblendbar (Auftrag bleibt unberührt)
-- ---------------------------------------------------------------------------
alter table public.auftraege
  add column if not exists bautagebuch_hidden_position_ids uuid[] not null default '{}';

comment on column public.auftraege.bautagebuch_hidden_position_ids is
  'Positions-IDs, die im Bautagebuch ausgeblendet sind (Leistung bleibt im Auftrag).';
