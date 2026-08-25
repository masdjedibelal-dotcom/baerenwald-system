-- HW-Tausch: Status `ersetzt` sperrt Portal-Sicht/Schreibrechte (F-021).
-- Partner sieht/schreibt nur aktive Zuweisungen; BT-Select bleibt für eigene
-- historische Einträge (Urheber) über handwerker_id am Eintrag möglich.

-- auftrag_handwerker: Partner sieht eigene Zeilen inkl. ersetzt (Audit),
-- aber Auftrags-/BT-Zugriff läuft über gefilterte Policies unten.

drop policy if exists "auftrag_bautagebuch_portal_select" on public.auftrag_bautagebuch_eintraege;
create policy "auftrag_bautagebuch_portal_select"
  on public.auftrag_bautagebuch_eintraege for select to authenticated
  using (
    public.is_portal_handwerker()
    and (
      -- eigene Einträge (Urheber) auch nach Redisposition lesbar
      handwerker_id = public.portal_handwerker_id()
      or auftrag_id in (
        select ah.auftrag_id
        from public.auftrag_handwerker ah
        where ah.handwerker_id = public.portal_handwerker_id()
          and lower(coalesce(ah.status, '')) not in ('ersetzt', 'abgelehnt')
        union
        select ap.auftrag_id
        from public.auftrag_positionen ap
        where ap.handwerker_id = public.portal_handwerker_id()
      )
    )
  );

drop policy if exists "auftrag_bautagebuch_portal_insert" on public.auftrag_bautagebuch_eintraege;
create policy "auftrag_bautagebuch_portal_insert"
  on public.auftrag_bautagebuch_eintraege for insert to authenticated
  with check (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
    and auftrag_id in (
      select ah.auftrag_id
      from public.auftrag_handwerker ah
      where ah.handwerker_id = public.portal_handwerker_id()
        and lower(coalesce(ah.status, '')) not in ('ersetzt', 'abgelehnt')
      union
      select ap.auftrag_id
      from public.auftrag_positionen ap
      where ap.handwerker_id = public.portal_handwerker_id()
    )
  );

drop policy if exists "auftraege_portal_handwerker_select" on public.auftraege;
create policy "auftraege_portal_handwerker_select"
  on public.auftraege for select to authenticated
  using (
    public.is_portal_handwerker()
    and id in (
      select ah.auftrag_id
      from public.auftrag_handwerker ah
      where ah.handwerker_id = public.portal_handwerker_id()
        and lower(coalesce(ah.status, '')) not in ('ersetzt', 'abgelehnt')
      union
      select ap.auftrag_id
      from public.auftrag_positionen ap
      where ap.handwerker_id = public.portal_handwerker_id()
    )
  );

drop policy if exists "auftrag_handwerker_portal_update" on public.auftrag_handwerker;
create policy "auftrag_handwerker_portal_update"
  on public.auftrag_handwerker for update to authenticated
  using (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
    and lower(coalesce(status, '')) not in ('ersetzt', 'abgelehnt')
  )
  with check (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
    and lower(coalesce(status, '')) not in ('ersetzt', 'abgelehnt')
  );

drop policy if exists "auftrag_handwerker_portal_vertrag_update" on public.auftrag_handwerker;
create policy "auftrag_handwerker_portal_vertrag_update"
  on public.auftrag_handwerker for update to authenticated
  using (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
    and lower(coalesce(status, '')) not in ('ersetzt', 'abgelehnt')
  )
  with check (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
    and lower(coalesce(status, '')) not in ('ersetzt', 'abgelehnt')
  );
