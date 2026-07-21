-- Abgleich mit handwerks-plattform Migration 20260611120000_portal_partner_vertrag_compliance.sql
-- partner_dokumente.status, scope 'stamm', Portal-RLS, Alias-Slugs

-- ---------------------------------------------------------------------------
-- partner_dokumente: Freigabe-Workflow (Portal)
-- ---------------------------------------------------------------------------
alter table public.partner_dokumente
  add column if not exists status text not null default 'freigegeben',
  add column if not exists freigegeben_am timestamptz,
  add column if not exists ablehnung_grund text;

comment on column public.partner_dokumente.status is
  'freigegeben | genehmigt | hochgeladen | in_pruefung | eingereicht | abgelehnt';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'partner_dokumente_status_check'
  ) then
    alter table public.partner_dokumente
      add constraint partner_dokumente_status_check
      check (status in (
        'freigegeben', 'genehmigt', 'hochgeladen', 'in_pruefung', 'eingereicht', 'abgelehnt'
      ));
  end if;
end $$;

update public.partner_dokumente
set status = 'freigegeben', freigegeben_am = coalesce(freigegeben_am, hochgeladen_am)
where status is null or status = 'freigegeben' and freigegeben_am is null;

-- ---------------------------------------------------------------------------
-- compliance_dokument_typen: scope 'stamm' (= CRM 'standard')
-- ---------------------------------------------------------------------------
alter table public.compliance_dokument_typen drop constraint if exists compliance_dokument_typen_scope_check;

alter table public.compliance_dokument_typen
  add constraint compliance_dokument_typen_scope_check
  check (scope in ('standard', 'stamm', 'bauprojekt', 'gewerk'));

update public.compliance_dokument_typen
set scope = 'stamm'
where scope = 'standard';

-- Portal-kompatible Alias-Slugs (gleiche Bezeichnung, kein Duplikat-Pflicht-Count)
insert into public.compliance_dokument_typen (
  slug, bezeichnung, beschreibung, pflicht_fuer_fachbetriebe, pflicht_bauprojekt,
  erneuerung_monate, sort_order, aktiv, kategorie, scope, mehrfach_erlaubt
) values
  (
    'haftpflicht',
    'Betriebshaftpflichtversicherung',
    'Alias für Portal (slug haftpflicht) — gleichwertig zu betriebshaftpflicht.',
    true, false, 12, 51, true, 'Versicherung', 'stamm', false
  ),
  (
    'uvv',
    'UVV / Sicherheitsunterweisung',
    'Alias für Portal (slug uvv) — gleichwertig zu sicherheitsunterweisung (Bauprojekt).',
    false, false, 12, 125, true, 'Bauprojekt & Vertrag', 'bauprojekt', false
  )
on conflict (slug) do update set
  bezeichnung = excluded.bezeichnung,
  beschreibung = excluded.beschreibung,
  aktiv = excluded.aktiv,
  scope = excluded.scope;

-- ---------------------------------------------------------------------------
-- RLS: Portal (wie Frontend-Migration)
-- ---------------------------------------------------------------------------
drop policy if exists "compliance_dokument_typen_portal_select" on public.compliance_dokument_typen;
create policy "compliance_dokument_typen_portal_select"
  on public.compliance_dokument_typen for select to authenticated
  using (
    public.is_portal_handwerker()
    and aktiv = true
    and scope in ('bauprojekt', 'gewerk', 'stamm')
  );

drop policy if exists "partner_dokumente_portal_select" on public.partner_dokumente;
create policy "partner_dokumente_portal_select"
  on public.partner_dokumente for select to authenticated
  using (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  );

drop policy if exists "partner_dokumente_portal_insert" on public.partner_dokumente;
create policy "partner_dokumente_portal_insert"
  on public.partner_dokumente for insert to authenticated
  with check (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
    and (
      auftrag_id is null
      or auftrag_id in (
        select ah.auftrag_id from public.auftrag_handwerker ah
        where ah.handwerker_id = public.portal_handwerker_id()
        union
        select ap.auftrag_id from public.auftrag_positionen ap
        where ap.handwerker_id = public.portal_handwerker_id()
      )
    )
  );

drop policy if exists "partner_dokumente_portal_update" on public.partner_dokumente;
create policy "partner_dokumente_portal_update"
  on public.partner_dokumente for update to authenticated
  using (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  )
  with check (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  );

-- Compliance-Status: nur freigegebene Stamm-Dokumente zählen
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
    and coalesce(t.scope, 'stamm') in ('standard', 'stamm')
    and not exists (
      select 1
      from public.partner_dokumente d
      where d.handwerker_id = p_handwerker_id
        and d.auftrag_id is null
        and d.typ = t.slug
        and d.datei_url is not null
        and trim(d.datei_url) <> ''
        and coalesce(d.status, 'freigegeben') in ('freigegeben', 'genehmigt')
        and (d.gueltig_bis is null or d.gueltig_bis >= now())
    );

  select count(*) into abgelaufen
  from public.partner_dokumente d
  join public.compliance_dokument_typen t on t.slug = d.typ
  where d.handwerker_id = p_handwerker_id
    and d.auftrag_id is null
    and coalesce(t.aktiv, true) = true
    and coalesce(t.scope, 'stamm') in ('standard', 'stamm')
    and t.pflicht_fuer_fachbetriebe = true
    and coalesce(d.status, 'freigegeben') in ('freigegeben', 'genehmigt')
    and d.gueltig_bis is not null
    and d.gueltig_bis < now();

  select count(*) into warnung
  from public.partner_dokumente d
  join public.compliance_dokument_typen t on t.slug = d.typ
  where d.handwerker_id = p_handwerker_id
    and d.auftrag_id is null
    and coalesce(t.aktiv, true) = true
    and coalesce(t.scope, 'stamm') in ('standard', 'stamm')
    and t.pflicht_fuer_fachbetriebe = true
    and coalesce(d.status, 'freigegeben') in ('freigegeben', 'genehmigt')
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
