-- Partner-Portal: Bautagebuch durch Handwerker

alter table public.auftrag_bautagebuch_eintraege
  add column if not exists handwerker_id uuid references public.handwerker (id) on delete set null;

create index if not exists auftrag_bautagebuch_handwerker_idx
  on public.auftrag_bautagebuch_eintraege (handwerker_id)
  where handwerker_id is not null;

comment on column public.auftrag_bautagebuch_eintraege.handwerker_id is
  'Handwerker, der den Eintrag erstellt hat (Partner-Portal)';

create or replace function public.portal_handwerker_auftrag_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select ah.auftrag_id from public.auftrag_handwerker ah
  where ah.handwerker_id = public.portal_handwerker_id()
  union
  select ap.auftrag_id from public.auftrag_positionen ap
  where ap.handwerker_id = public.portal_handwerker_id();
$$;

grant execute on function public.portal_handwerker_auftrag_ids() to authenticated, service_role;

-- CRM behält Vollzugriff
drop policy if exists "auftrag_bautagebuch_auth_all" on public.auftrag_bautagebuch_eintraege;
drop policy if exists "auftrag_bautagebuch_crm_staff_all" on public.auftrag_bautagebuch_eintraege;
create policy "auftrag_bautagebuch_crm_staff_all"
  on public.auftrag_bautagebuch_eintraege for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

-- Partner: nur eigene Aufträge (über auftrag_handwerker oder positionen)
drop policy if exists "auftrag_bautagebuch_portal_select" on public.auftrag_bautagebuch_eintraege;
create policy "auftrag_bautagebuch_portal_select"
  on public.auftrag_bautagebuch_eintraege for select to authenticated
  using (
    public.is_portal_handwerker()
    and auftrag_id in (select public.portal_handwerker_auftrag_ids())
  );

drop policy if exists "auftrag_bautagebuch_portal_insert" on public.auftrag_bautagebuch_eintraege;
create policy "auftrag_bautagebuch_portal_insert"
  on public.auftrag_bautagebuch_eintraege for insert to authenticated
  with check (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
    and auftrag_id in (select public.portal_handwerker_auftrag_ids())
  );

drop policy if exists "auftrag_bautagebuch_portal_update" on public.auftrag_bautagebuch_eintraege;
create policy "auftrag_bautagebuch_portal_update"
  on public.auftrag_bautagebuch_eintraege for update to authenticated
  using (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  )
  with check (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  );

-- auftrag_handwerker + auftraege + positionen (Partner lesen)
alter table public.auftrag_handwerker enable row level security;

drop policy if exists "auftrag_handwerker_crm_staff_all" on public.auftrag_handwerker;
create policy "auftrag_handwerker_crm_staff_all"
  on public.auftrag_handwerker for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "auftrag_handwerker_portal_select" on public.auftrag_handwerker;
create policy "auftrag_handwerker_portal_select"
  on public.auftrag_handwerker for select to authenticated
  using (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  );

drop policy if exists "auftraege_portal_handwerker_select" on public.auftraege;
create policy "auftraege_portal_handwerker_select"
  on public.auftraege for select to authenticated
  using (
    public.is_portal_handwerker()
    and id in (select public.portal_handwerker_auftrag_ids())
  );

drop policy if exists "auftrag_positionen_portal_handwerker_select" on public.auftrag_positionen;
create policy "auftrag_positionen_portal_handwerker_select"
  on public.auftrag_positionen for select to authenticated
  using (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  );
