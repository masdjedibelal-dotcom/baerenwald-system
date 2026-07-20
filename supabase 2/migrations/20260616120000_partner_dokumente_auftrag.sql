-- Projektbezogene Compliance: Verknüpfung Handwerker ↔ Auftrag, Typ „Individuell“
-- Enthält Voraussetzungen aus 20260615120000 (falls noch nicht ausgeführt).

-- ---------------------------------------------------------------------------
-- partner_dokumente: Auftragsbezug
-- ---------------------------------------------------------------------------
alter table public.partner_dokumente
  add column if not exists auftrag_id uuid references public.auftraege (id) on delete cascade;

create index if not exists idx_partner_dokumente_auftrag
  on public.partner_dokumente (auftrag_id)
  where auftrag_id is not null;

create index if not exists idx_partner_dokumente_hw_auftrag
  on public.partner_dokumente (handwerker_id, auftrag_id);

comment on column public.partner_dokumente.auftrag_id is
  'NULL = allgemeine Partner-Compliance; gesetzt = projektbezogener Nachweis (sichtbar am Auftrag und beim Handwerker)';

-- ---------------------------------------------------------------------------
-- compliance_dokument_typen: fehlende Spalten (idempotent)
-- ---------------------------------------------------------------------------
alter table public.compliance_dokument_typen
  add column if not exists scope text not null default 'standard',
  add column if not exists gewerk_slugs text[],
  add column if not exists pflicht_bauprojekt boolean not null default false,
  add column if not exists vertrag_referenz text,
  add column if not exists kategorie text,
  add column if not exists aktiv boolean not null default true,
  add column if not exists mehrfach_erlaubt boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'compliance_dokument_typen_scope_check'
  ) then
    alter table public.compliance_dokument_typen
      add constraint compliance_dokument_typen_scope_check
      check (scope in ('standard', 'bauprojekt', 'gewerk'));
  end if;
end $$;

comment on column public.compliance_dokument_typen.mehrfach_erlaubt is
  'Mehrere Uploads pro Handwerker/Auftrag erlaubt (z. B. Individuell)';

-- ---------------------------------------------------------------------------
-- Typ „Individuell“
-- ---------------------------------------------------------------------------
insert into public.compliance_dokument_typen (
  slug, bezeichnung, beschreibung, pflicht_fuer_fachbetriebe, pflicht_bauprojekt,
  erneuerung_monate, sort_order, aktiv, kategorie, scope, mehrfach_erlaubt
) values (
  'individuell',
  'Individuell',
  'Frei benennbarer projektbezogener Nachweis — Bezeichnung beim Upload anpassbar.',
  false, false, null, 500, true, 'Individuell', 'bauprojekt', true
)
on conflict (slug) do update set
  bezeichnung = excluded.bezeichnung,
  beschreibung = excluded.beschreibung,
  scope = excluded.scope,
  mehrfach_erlaubt = excluded.mehrfach_erlaubt,
  kategorie = excluded.kategorie,
  aktiv = excluded.aktiv;
