-- RLS: Organisation sieht Meldungen zu ihren Objekten + eigene Leads

create or replace function public.portal_kunde_portal_modus()
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    (select k.portal_modus from public.kunden k where k.auth_user_id = auth.uid() limit 1),
    'privat'
  );
$$;

create or replace function public.portal_is_organisation()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.portal_kunde_portal_modus() = 'organisation';
$$;

create or replace function public.portal_organisation_objekt_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select o.id
  from public.kunden_objekte o
  join public.kunden k on k.id = o.kunde_id
  where k.auth_user_id = auth.uid()
    and k.portal_modus = 'organisation';
$$;

drop policy if exists "leads_portal_organisation_select" on public.leads;
create policy "leads_portal_organisation_select"
  on public.leads for select to authenticated
  using (
    public.portal_is_organisation()
    and (
      kunde_id = public.portal_kunde_id()
      or auftraggeber_kunde_id = public.portal_kunde_id()
      or kunde_objekt_id in (select public.portal_organisation_objekt_ids())
    )
  );

drop policy if exists "kunden_objekte_portal_organisation_select" on public.kunden_objekte;
create policy "kunden_objekte_portal_organisation_select"
  on public.kunden_objekte for select to authenticated
  using (
    kunde_id = public.portal_kunde_id()
    and public.portal_is_organisation()
  );

drop policy if exists "kunden_objekte_portal_organisation_insert" on public.kunden_objekte;
create policy "kunden_objekte_portal_organisation_insert"
  on public.kunden_objekte for insert to authenticated
  with check (
    kunde_id = public.portal_kunde_id()
    and public.portal_is_organisation()
  );

drop policy if exists "kunden_objekte_portal_organisation_update" on public.kunden_objekte;
create policy "kunden_objekte_portal_organisation_update"
  on public.kunden_objekte for update to authenticated
  using (
    kunde_id = public.portal_kunde_id()
    and public.portal_is_organisation()
  )
  with check (
    kunde_id = public.portal_kunde_id()
    and public.portal_is_organisation()
  );

drop policy if exists "kunden_portal_organisation_update_settings" on public.kunden;
create policy "kunden_portal_organisation_update_settings"
  on public.kunden for update to authenticated
  using (
    auth_user_id = auth.uid()
    and portal_modus = 'organisation'
  )
  with check (
    auth_user_id = auth.uid()
    and portal_modus = 'organisation'
  );

revoke all on function public.portal_kunde_portal_modus() from public;
revoke all on function public.portal_is_organisation() from public;
revoke all on function public.portal_organisation_objekt_ids() from public;
grant execute on function public.portal_kunde_portal_modus() to authenticated, service_role;
grant execute on function public.portal_is_organisation() to authenticated, service_role;
grant execute on function public.portal_organisation_objekt_ids() to authenticated, service_role;

comment on function public.portal_is_organisation() is
  'true wenn eingeloggter Nutzer ein Auftraggeber-Portal-Konto hat';
