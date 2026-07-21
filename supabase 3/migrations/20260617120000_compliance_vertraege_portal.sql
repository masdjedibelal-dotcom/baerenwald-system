-- Rahmenvertrag als Compliance-Typ; Portal-Bestätigung Projektvertrag

insert into public.compliance_dokument_typen (
  slug, bezeichnung, beschreibung, pflicht_fuer_fachbetriebe, pflicht_bauprojekt,
  erneuerung_monate, sort_order, aktiv, kategorie, scope, vertrag_referenz
) values (
  'rahmenvertrag',
  'Rahmenvertrag (Partner)',
  'Unterzeichneter Rahmenvertrag für die dauerhafte Nachunternehmer-Zusammenarbeit. Wird automatisch verknüpft, sobald der RV im CRM erzeugt wurde.',
  true, false, null, 5, true, 'Verträge', 'standard', 'Rahmenvertrag §1–§7'
)
on conflict (slug) do update set
  bezeichnung = excluded.bezeichnung,
  beschreibung = excluded.beschreibung,
  pflicht_fuer_fachbetriebe = excluded.pflicht_fuer_fachbetriebe,
  kategorie = excluded.kategorie,
  scope = excluded.scope,
  vertrag_referenz = excluded.vertrag_referenz,
  aktiv = excluded.aktiv;

alter table public.auftrag_handwerker
  add column if not exists projektvertrag_bestaetigt_am timestamptz,
  add column if not exists projektvertrag_quelle text;

comment on column public.auftrag_handwerker.projektvertrag_bestaetigt_am is
  'Zeitpunkt der Partner-Bestätigung (Portal) oder CRM-Freigabe — gilt als Annahme des Projektvertrags';
comment on column public.auftrag_handwerker.projektvertrag_quelle is
  'crm_wizard | portal_bestaetigung';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'auftrag_handwerker_projektvertrag_quelle_check'
  ) then
    alter table public.auftrag_handwerker
      add constraint auftrag_handwerker_projektvertrag_quelle_check
      check (projektvertrag_quelle is null or projektvertrag_quelle in ('crm_wizard', 'portal_bestaetigung'));
  end if;
end $$;

-- Partner: eigenen Projektvertrag lesen/schreiben
alter table public.handwerker_vertraege enable row level security;

drop policy if exists "handwerker_vertraege_portal_select" on public.handwerker_vertraege;
create policy "handwerker_vertraege_portal_select"
  on public.handwerker_vertraege for select to authenticated
  using (
    public.is_crm_staff()
    or (
      public.is_portal_handwerker()
      and handwerker_id = public.portal_handwerker_id()
    )
  );

drop policy if exists "handwerker_vertraege_portal_insert" on public.handwerker_vertraege;
create policy "handwerker_vertraege_portal_insert"
  on public.handwerker_vertraege for insert to authenticated
  with check (
    public.is_crm_staff()
    or (
      public.is_portal_handwerker()
      and handwerker_id = public.portal_handwerker_id()
      and typ = 'projekt'
    )
  );

drop policy if exists "handwerker_vertraege_portal_update" on public.handwerker_vertraege;
create policy "handwerker_vertraege_portal_update"
  on public.handwerker_vertraege for update to authenticated
  using (
    public.is_crm_staff()
    or (
      public.is_portal_handwerker()
      and handwerker_id = public.portal_handwerker_id()
      and typ = 'projekt'
    )
  )
  with check (
    public.is_crm_staff()
    or (
      public.is_portal_handwerker()
      and handwerker_id = public.portal_handwerker_id()
      and typ = 'projekt'
    )
  );

-- Partner: Bestätigung auf eigener Zuordnung
drop policy if exists "auftrag_handwerker_portal_vertrag_update" on public.auftrag_handwerker;
create policy "auftrag_handwerker_portal_vertrag_update"
  on public.auftrag_handwerker for update to authenticated
  using (
    public.is_crm_staff()
    or (
      public.is_portal_handwerker()
      and handwerker_id = public.portal_handwerker_id()
    )
  )
  with check (
    public.is_crm_staff()
    or (
      public.is_portal_handwerker()
      and handwerker_id = public.portal_handwerker_id()
    )
  );
