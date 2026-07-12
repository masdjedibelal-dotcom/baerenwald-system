-- Compliance-Dokumenttypen: Scope (standard | bauprojekt | gewerk), Gewerk-Filter, Vertragsbezug
-- Voraussetzungen aus älteren Migrationen (kategorie, aktiv) werden hier mit angelegt.

alter table public.partner_dokumente
  add column if not exists auftrag_id uuid references public.auftraege (id) on delete cascade;

alter table public.compliance_dokument_typen
  add column if not exists kategorie text,
  add column if not exists aktiv boolean not null default true,
  add column if not exists scope text not null default 'standard',
  add column if not exists gewerk_slugs text[],
  add column if not exists pflicht_bauprojekt boolean not null default false,
  add column if not exists vertrag_referenz text,
  add column if not exists mehrfach_erlaubt boolean not null default false;

comment on column public.compliance_dokument_typen.kategorie is
  'Optional: Überschrift für Gruppen in der Compliance-Liste';

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

comment on column public.compliance_dokument_typen.scope is
  'standard = alle Gewerke; bauprojekt = je Auftrag/Vorhaben; gewerk = nur passende Gewerke (gewerk_slugs)';
comment on column public.compliance_dokument_typen.gewerk_slugs is
  'Bei scope=gewerk: Slugs aus gewerke.slug; leer = für alle Gewerke sichtbar';
comment on column public.compliance_dokument_typen.pflicht_bauprojekt is
  'Pflicht bei aktivem Bauprojekt (Status-Berechnung folgt projektbezogen)';
comment on column public.compliance_dokument_typen.vertrag_referenz is
  'Optional: Verweis auf Vertragspassus (z. B. §6, Anlage 1)';

-- Bestehende Typen: Kategorien, Scope, Vertragsbezug
update public.compliance_dokument_typen set
  scope = 'standard',
  kategorie = coalesce(kategorie, 'Allgemeine Partnerunterlagen'),
  vertrag_referenz = '§6 / Rahmenvertrag §2',
  beschreibung = coalesce(beschreibung, 'Nachweis der Sozialkassen-Bau (SOKA-Bau) für Bauleistungen.')
where slug = 'soka_bescheinigung';

update public.compliance_dokument_typen set
  scope = 'standard',
  kategorie = coalesce(kategorie, 'Steuern & Abgaben'),
  beschreibung = coalesce(beschreibung, 'Freistellung vom Steuerabzug bei Bauleistungen (Reverse Charge / §13b UStG).')
where slug = 'freistellung_13b';

update public.compliance_dokument_typen set
  scope = 'standard',
  kategorie = coalesce(kategorie, 'Unternehmen'),
  beschreibung = coalesce(beschreibung, 'Aktueller Handelsregisterauszug (GmbH, UG, KG).')
where slug = 'handelsregister';

update public.compliance_dokument_typen set
  scope = 'standard',
  kategorie = coalesce(kategorie, 'Allgemeine Partnerunterlagen'),
  vertrag_referenz = '§6 / Anlage 1',
  beschreibung = coalesce(beschreibung, 'Gewerbeanmeldung bzw. Gewerbeschein des Nachunternehmers.')
where slug = 'gewerbeanmeldung';

update public.compliance_dokument_typen set
  scope = 'standard',
  kategorie = coalesce(kategorie, 'Versicherung'),
  vertrag_referenz = '§6 / Anlage 1',
  beschreibung = coalesce(beschreibung, 'Nachweis einer gültigen Betriebshaftpflicht (Bauleistungen).')
where slug = 'betriebshaftpflicht';

update public.compliance_dokument_typen set
  scope = 'standard',
  kategorie = coalesce(kategorie, 'Versicherung'),
  vertrag_referenz = '§6 / Anlage 1',
  beschreibung = coalesce(beschreibung, 'Mitgliedschaft / Unfallversicherung der zuständigen Berufsgenossenschaft.')
where slug = 'berufsgenossenschaft';

update public.compliance_dokument_typen set
  scope = 'bauprojekt',
  kategorie = coalesce(kategorie, 'Bauprojekt & Vertrag'),
  pflicht_bauprojekt = true,
  beschreibung = coalesce(beschreibung, 'Nachweis der Sicherheitsunterweisung / Baustelleneinweisung.')
where slug = 'sicherheitsunterweisung';

update public.compliance_dokument_typen set
  scope = 'standard',
  kategorie = coalesce(kategorie, 'Qualifikation'),
  beschreibung = coalesce(beschreibung, 'Meister-, Gesellen- oder Fachkraftnachweise.')
where slug = 'fachkraefte_nachweis';

update public.compliance_dokument_typen set
  scope = 'standard',
  kategorie = coalesce(kategorie, 'Personal & Lohn'),
  beschreibung = coalesce(beschreibung, 'Nachweis Einhaltung Mindestlohn (Lohnunterlagen, Bestätigung).')
where slug = 'mindestlohn_nachweis';

update public.compliance_dokument_typen set
  scope = 'gewerk',
  kategorie = coalesce(kategorie, 'Gewerkspezifisch'),
  gewerk_slugs = array['wdvs', 'fassade', 'maler', 'fliesen', 'trockenbau', 'sanitaer', 'heizung', 'elektro']::text[],
  beschreibung = coalesce(beschreibung, 'Entsorgungs- / Abfallnachweise falls für das Gewerk relevant.')
where slug = 'umwelt_abfall';

update public.compliance_dokument_typen set
  scope = 'standard',
  kategorie = coalesce(kategorie, 'Personal & Lohn'),
  beschreibung = coalesce(beschreibung, 'Unbedenklichkeitsbescheinigung der Krankenkasse (Sozialversicherung).')
where slug = 'krankenkasse_unbedenklichkeit';

-- Neue Typen (Vertrag Anlage 1 + Baurecht)
insert into public.compliance_dokument_typen (
  slug, bezeichnung, beschreibung, pflicht_fuer_fachbetriebe, pflicht_bauprojekt,
  erneuerung_monate, sort_order, aktiv, kategorie, scope, vertrag_referenz
) values
  (
    'freistellung_48b',
    'Freistellungsbescheinigung § 48b EStG',
    'Freistellung vom Steuerabzug bei Bauleistungen (Lohnsteuer). Pflicht laut Nachunternehmervertrag.',
    true, false, 12, 15, true, 'Steuern & Abgaben', 'standard', '§6 / Anlage 1'
  ),
  (
    'personalliste',
    'Personalliste (eingesetzte Mitarbeiter)',
    'Aktuelle Liste aller auf der Baustelle eingesetzten Mitarbeiter inkl. Qualifikation.',
    false, true, 1, 120, true, 'Bauprojekt & Vertrag', 'bauprojekt', 'Anlage 1'
  ),
  (
    'ausweiskopien_mitarbeiter',
    'Ausweiskopien Mitarbeiter',
    'Kopien gültiger Ausweise aller eingesetzten Mitarbeiter (Schwarzarbeitsbekämpfung).',
    false, true, 1, 130, true, 'Bauprojekt & Vertrag', 'bauprojekt', 'Anlage 1'
  ),
  (
    'a1_bescheinigung',
    'A1-Bescheinigung (Entsendung EU)',
    'Bei grenzüberschreitend eingesetztem Personal: A1-Bescheinigung zur Sozialversicherung.',
    false, false, 12, 140, true, 'Bauprojekt & Vertrag', 'bauprojekt', 'Anlage 1'
  ),
  (
    'benennung_bauleiter',
    'Benennung Bauleiter / Polier',
    'Schriftliche Benennung des verantwortlichen Bauleiters bzw. Poliers für das Vorhaben.',
    false, true, null, 150, true, 'Bauprojekt & Vertrag', 'bauprojekt', 'Anlage 1 / §5'
  ),
  (
    'brandschutz_wdvs',
    'Brandschutznachweis WDVS',
    'Brandschutztechnischer Nachweis / Dossier für WDVS-System (z. B. ETA, Prüfzeugnis).',
    false, false, null, 210, true, 'Gewerkspezifisch', 'gewerk', null
  ),
  (
    'elektro_fachbetrieb',
    'Elektro-Fachbetrieb / Meisterbetrieb',
    'Nachweis eingetragener Elektrofachbetrieb bzw. Meisterbetrieb (VDE, Innung).',
    false, false, 12, 220, true, 'Gewerkspezifisch', 'gewerk', null
  ),
  (
    'gas_wasser_nachweis',
    'Gas/Wasser-Installateur-Nachweis',
    'Fachbetriebserklärung / Zulassung für Gas- und Wasserinstallation.',
    false, false, 12, 230, true, 'Gewerkspezifisch', 'gewerk', null
  )
on conflict (slug) do update set
  bezeichnung = excluded.bezeichnung,
  beschreibung = excluded.beschreibung,
  pflicht_fuer_fachbetriebe = excluded.pflicht_fuer_fachbetriebe,
  pflicht_bauprojekt = excluded.pflicht_bauprojekt,
  erneuerung_monate = excluded.erneuerung_monate,
  sort_order = excluded.sort_order,
  aktiv = excluded.aktiv,
  kategorie = excluded.kategorie,
  scope = excluded.scope,
  vertrag_referenz = excluded.vertrag_referenz;

update public.compliance_dokument_typen
set gewerk_slugs = array['wdvs', 'fassade']::text[]
where slug = 'brandschutz_wdvs';

update public.compliance_dokument_typen
set gewerk_slugs = array['elektro']::text[]
where slug = 'elektro_fachbetrieb';

update public.compliance_dokument_typen
set gewerk_slugs = array['sanitaer', 'heizung']::text[]
where slug = 'gas_wasser_nachweis';

-- Compliance-Status: nur aktive Standard-Pflichttypen
create or replace function public.compute_handwercher_compliance(p_handwerker_id uuid)
returns text
language plpgsql
stable
as $$
declare
  fehlend int;
  abgelaufen int;
  warnung int;
begin
  select count(*) into fehlend
  from public.compliance_dokument_typen t
  where t.pflicht_fuer_fachbetriebe = true
    and coalesce(t.aktiv, true) = true
    and coalesce(t.scope, 'standard') = 'standard'
    and not exists (
      select 1
      from public.partner_dokumente d
      where d.handwerker_id = p_handwerker_id
        and d.auftrag_id is null
        and d.typ = t.slug
        and d.datei_url is not null
        and trim(d.datei_url) <> ''
        and (d.gueltig_bis is null or d.gueltig_bis >= now())
    );

  select count(*) into abgelaufen
  from public.partner_dokumente d
  join public.compliance_dokument_typen t on t.slug = d.typ
  where d.handwerker_id = p_handwerker_id
    and d.auftrag_id is null
    and coalesce(t.aktiv, true) = true
    and coalesce(t.scope, 'standard') = 'standard'
    and t.pflicht_fuer_fachbetriebe = true
    and d.gueltig_bis is not null
    and d.gueltig_bis < now();

  select count(*) into warnung
  from public.partner_dokumente d
  join public.compliance_dokument_typen t on t.slug = d.typ
  where d.handwerker_id = p_handwerker_id
    and d.auftrag_id is null
    and coalesce(t.aktiv, true) = true
    and coalesce(t.scope, 'standard') = 'standard'
    and t.pflicht_fuer_fachbetriebe = true
    and d.gueltig_bis is not null
    and d.gueltig_bis >= now()
    and d.gueltig_bis <= now() + interval '30 days';

  if fehlend > 0 or abgelaufen > 0 then
    return 'unvollständig';
  elsif warnung > 0 then
    return 'warnung';
  else
    return 'vollständig';
  end if;
end;
$$;

-- Bestehende Fachbetriebe neu berechnen
update public.handwerker h
set compliance_status = case
  when coalesce(h.ist_fachbetrieb, false) then public.compute_handwercher_compliance(h.id)
  else 'vollständig'
end
where coalesce(h.ist_fachbetrieb, false) = true;
