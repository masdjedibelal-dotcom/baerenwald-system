-- Compliance in 3 Ebenen: allgemein | meister | leistung
-- allgemein + meister = Partner-Stamm (auftrag_id null)
-- leistung = je Auftrag / Leistungsvertrag

alter table public.compliance_dokument_typen
  add column if not exists compliance_ebene text not null default 'allgemein',
  add column if not exists nur_bei_bauleistung boolean not null default false;

alter table public.gewerke
  add column if not exists ist_bauleistung boolean not null default true;

comment on column public.compliance_dokument_typen.compliance_ebene is
  'allgemein = alle Partner; meister = Fachbetrieb/Meister-Gewerke; leistung = je Auftrag/Leistungsvertrag';
comment on column public.compliance_dokument_typen.nur_bei_bauleistung is
  'Nur Pflicht wenn Partner mindestens ein Bau-Gewerk hat (gewerke.ist_bauleistung)';
comment on column public.gewerke.ist_bauleistung is
  'false = Facility/Reinigung etc. — kein Bau-Paket (SoKA, §48b) im Stamm';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'compliance_dokument_typen_ebene_check'
  ) then
    alter table public.compliance_dokument_typen
      add constraint compliance_dokument_typen_ebene_check
      check (compliance_ebene in ('allgemein', 'meister', 'leistung'));
  end if;
end $$;

-- Facility / reine Dienstleistung ohne Bau
update public.gewerke
set ist_bauleistung = false
where slug in ('hausmeister', 'reinigung', 'garten', 'winterdienst', 'logistik', 'dienstleistungen', 'gastronomie');

-- ---------------------------------------------------------------------------
-- Ebene + Pflicht-Flags (sinnvolle Defaults)
-- ---------------------------------------------------------------------------

-- ALLGEMEIN — jeder Partner
update public.compliance_dokument_typen set
  compliance_ebene = 'allgemein',
  scope = 'stamm',
  nur_bei_bauleistung = false,
  pflicht_fuer_fachbetriebe = true,
  pflicht_bauprojekt = false,
  kategorie = coalesce(kategorie, 'Allgemeine Partnerunterlagen')
where slug in ('rahmenvertrag', 'gewerbeanmeldung', 'betriebshaftpflicht');

-- ALLGEMEIN — Bau-Partner (SoKA, Steuer, Sozial)
update public.compliance_dokument_typen set
  compliance_ebene = 'allgemein',
  scope = 'stamm',
  nur_bei_bauleistung = true,
  pflicht_fuer_fachbetriebe = true,
  pflicht_bauprojekt = false,
  kategorie = coalesce(kategorie, 'Bau & Sozialversicherung')
where slug in (
  'soka_bescheinigung',
  'freistellung_13b',
  'freistellung_48b',
  'berufsgenossenschaft',
  'krankenkasse_unbedenklichkeit'
);

-- ALLGEMEIN — optional
update public.compliance_dokument_typen set
  compliance_ebene = 'allgemein',
  scope = 'stamm',
  nur_bei_bauleistung = false,
  pflicht_fuer_fachbetriebe = false,
  pflicht_bauprojekt = false,
  kategorie = coalesce(kategorie, 'Unternehmen')
where slug = 'handelsregister';

update public.compliance_dokument_typen set
  compliance_ebene = 'allgemein',
  scope = 'stamm',
  nur_bei_bauleistung = false,
  pflicht_fuer_fachbetriebe = false,
  aktiv = false
where slug = 'haftpflicht';

-- MEISTER — Stamm, gewerkspezifisch
update public.compliance_dokument_typen set
  compliance_ebene = 'meister',
  scope = 'stamm',
  nur_bei_bauleistung = false,
  pflicht_fuer_fachbetriebe = true,
  pflicht_bauprojekt = false,
  kategorie = coalesce(kategorie, 'Meister & Qualifikation')
where slug = 'fachkraefte_nachweis';

update public.compliance_dokument_typen set
  compliance_ebene = 'meister',
  scope = 'stamm',
  nur_bei_bauleistung = false,
  pflicht_fuer_fachbetriebe = true,
  pflicht_bauprojekt = false,
  kategorie = coalesce(kategorie, 'Meister & Qualifikation')
where slug in ('elektro_fachbetrieb', 'gas_wasser_nachweis', 'brandschutz_wdvs');

-- LEISTUNG — je Auftrag / Leistungsvertrag
update public.compliance_dokument_typen set
  compliance_ebene = 'leistung',
  scope = 'bauprojekt',
  nur_bei_bauleistung = true,
  pflicht_fuer_fachbetriebe = false,
  pflicht_bauprojekt = true,
  kategorie = coalesce(kategorie, 'Leistungsvertrag & Baustelle')
where slug in (
  'sicherheitsunterweisung',
  'uvv',
  'personalliste',
  'benennung_bauleiter',
  'mindestlohn_nachweis'
);

update public.compliance_dokument_typen set
  compliance_ebene = 'leistung',
  scope = 'bauprojekt',
  nur_bei_bauleistung = true,
  pflicht_fuer_fachbetriebe = false,
  pflicht_bauprojekt = false,
  kategorie = coalesce(kategorie, 'Leistungsvertrag & Baustelle')
where slug in ('ausweiskopien_mitarbeiter', 'a1_bescheinigung');

update public.compliance_dokument_typen set
  compliance_ebene = 'leistung',
  scope = 'bauprojekt',
  nur_bei_bauleistung = false,
  pflicht_fuer_fachbetriebe = false,
  pflicht_bauprojekt = false,
  kategorie = 'Individuell',
  mehrfach_erlaubt = true
where slug = 'individuell';

update public.compliance_dokument_typen set
  compliance_ebene = 'leistung',
  scope = 'gewerk',
  nur_bei_bauleistung = true,
  pflicht_fuer_fachbetriebe = false,
  pflicht_bauprojekt = false,
  kategorie = coalesce(kategorie, 'Gewerkspezifisch (Leistung)')
where slug = 'umwelt_abfall';

-- Legacy scope → ebene (falls noch nicht gesetzt)
update public.compliance_dokument_typen
set compliance_ebene = 'leistung'
where compliance_ebene = 'allgemein'
  and scope in ('bauprojekt', 'gewerk')
  and slug not in (
    select slug from public.compliance_dokument_typen
    where compliance_ebene in ('allgemein', 'meister', 'leistung')
  );

-- ---------------------------------------------------------------------------
-- Compliance-Status: Allgemein (+ Bau) + Meister am Stamm
-- ---------------------------------------------------------------------------
create or replace function public.handwerker_hat_bauleistung(p_gewerke text[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.gewerke g
    where g.slug = any (coalesce(p_gewerke, '{}'::text[]))
      and g.ist_bauleistung = true
  );
$$;

create or replace function public.handwerker_hat_meister_gewerk(p_gewerke text[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.gewerke g
    where g.slug = any (coalesce(p_gewerke, '{}'::text[]))
      and g.ausfuehrung in ('fachbetrieb', 'beides')
  );
$$;

create or replace function public.compute_handwercher_compliance(p_handwerker_id uuid)
returns text
language plpgsql
stable
as $$
declare
  fehlend int;
  abgelaufen int;
  warnung int;
  hw_gewerke text[];
  hat_bau boolean;
  hat_meister boolean;
begin
  select coalesce(h.gewerke, '{}'::text[]) into hw_gewerke
  from public.handwerker h where h.id = p_handwerker_id;

  hat_bau := public.handwerker_hat_bauleistung(hw_gewerke);
  hat_meister := public.handwerker_hat_meister_gewerk(hw_gewerke);

  select count(*) into fehlend
  from public.compliance_dokument_typen t
  where coalesce(t.aktiv, true) = true
    and t.compliance_ebene in ('allgemein', 'meister')
    and t.pflicht_fuer_fachbetriebe = true
    and (not t.nur_bei_bauleistung or hat_bau)
    and (t.compliance_ebene <> 'meister' or hat_meister)
    and (
      t.gewerk_slugs is null
      or cardinality(t.gewerk_slugs) = 0
      or t.gewerk_slugs && hw_gewerke
    )
    and not exists (
      select 1
      from public.partner_dokumente d
      where d.handwerker_id = p_handwerker_id
        and d.auftrag_id is null
        and d.typ = t.slug
        and d.datei_url is not null
        and trim(d.datei_url) <> ''
        and coalesce(d.status, 'freigegeben') in ('freigegeben', 'genehmigt')
        and (d.gueltig_bis is null or d.gueltig_bis >= current_date)
    )
    and t.slug <> 'rahmenvertrag';

  -- Rahmenvertrag: auch über handwerker_vertraege
  if exists (
    select 1 from public.compliance_dokument_typen t
    where t.slug = 'rahmenvertrag' and t.pflicht_fuer_fachbetriebe = true and coalesce(t.aktiv, true)
  ) and not exists (
    select 1 from public.partner_dokumente d
    where d.handwerker_id = p_handwerker_id and d.typ = 'rahmenvertrag'
      and d.auftrag_id is null and d.datei_url is not null and trim(d.datei_url) <> ''
      and coalesce(d.status, 'freigegeben') in ('freigegeben', 'genehmigt')
      and (d.gueltig_bis is null or d.gueltig_bis >= current_date)
  ) and not exists (
    select 1 from public.handwerker_vertraege v
    where v.handwerker_id = p_handwerker_id and v.typ = 'rahmen'
      and v.pdf_url is not null and trim(v.pdf_url) <> ''
      and v.status in ('pdf_erzeugt', 'unterschrieben')
  ) then
    fehlend := fehlend + 1;
  end if;

  select count(*) into abgelaufen
  from public.partner_dokumente d
  join public.compliance_dokument_typen t on t.slug = d.typ
  where d.handwerker_id = p_handwerker_id
    and d.auftrag_id is null
    and coalesce(t.aktiv, true) = true
    and t.compliance_ebene in ('allgemein', 'meister')
    and t.pflicht_fuer_fachbetriebe = true
    and d.gueltig_bis is not null
    and d.gueltig_bis < current_date;

  select count(*) into warnung
  from public.partner_dokumente d
  join public.compliance_dokument_typen t on t.slug = d.typ
  where d.handwerker_id = p_handwerker_id
    and d.auftrag_id is null
    and coalesce(t.aktiv, true) = true
    and t.compliance_ebene in ('allgemein', 'meister')
    and t.pflicht_fuer_fachbetriebe = true
    and d.gueltig_bis is not null
    and d.gueltig_bis >= current_date
    and d.gueltig_bis <= current_date + interval '30 days';

  if fehlend > 0 or abgelaufen > 0 then
    return 'unvollständig';
  elsif warnung > 0 then
    return 'warnung';
  else
    return 'vollständig';
  end if;
end;
$$;

-- Alle Partner mit Gewerken neu berechnen
update public.handwerker h
set compliance_status = public.compute_handwercher_compliance(h.id)
where coalesce(h.ist_fachbetrieb, true) = true;
