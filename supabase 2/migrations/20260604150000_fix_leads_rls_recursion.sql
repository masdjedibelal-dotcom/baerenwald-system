-- Behebt: infinite recursion detected in policy for relation "leads"
-- Ursache: Portal-Policies auf leads/angebote/kunden verweisen sich gegenseitig.
-- Lösung: security-definer-Hilfsfunktionen mit row_security = off.

create or replace function public.is_crm_staff()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.user_profiles where id = auth.uid()
  );
$$;

create or replace function public.portal_kunde_id()
returns uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select id from public.kunden where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.portal_kunde_lead_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select l.id
  from public.leads l
  where l.kunde_id = public.portal_kunde_id();
$$;

create or replace function public.portal_handwerker_id()
returns uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select id from public.handwerker where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.is_portal_handwerker()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.portal_handwerker_id() is not null
    and not public.is_crm_staff();
$$;

create or replace function public.portal_handwerker_angebot_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select ah.angebot_id
  from public.angebot_handwerker ah
  where ah.handwerker_id = public.portal_handwerker_id();
$$;

create or replace function public.portal_handwerker_lead_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select distinct a.lead_id
  from public.angebote a
  inner join public.angebot_handwerker ah on ah.angebot_id = a.id
  where ah.handwerker_id = public.portal_handwerker_id()
    and a.lead_id is not null;
$$;

create or replace function public.portal_handwerker_kunde_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select distinct a.kunde_id
  from public.angebote a
  inner join public.angebot_handwerker ah on ah.angebot_id = a.id
  where ah.handwerker_id = public.portal_handwerker_id()
    and a.kunde_id is not null;
$$;

revoke all on function public.is_crm_staff() from public;
revoke all on function public.portal_kunde_id() from public;
revoke all on function public.portal_kunde_lead_ids() from public;
revoke all on function public.portal_handwerker_id() from public;
revoke all on function public.is_portal_handwerker() from public;
revoke all on function public.portal_handwerker_angebot_ids() from public;
revoke all on function public.portal_handwerker_lead_ids() from public;
revoke all on function public.portal_handwerker_kunde_ids() from public;

grant execute on function public.is_crm_staff() to authenticated, service_role;
grant execute on function public.portal_kunde_id() to authenticated, service_role;
grant execute on function public.portal_kunde_lead_ids() to authenticated, service_role;
grant execute on function public.portal_handwerker_id() to authenticated, service_role;
grant execute on function public.is_portal_handwerker() to authenticated, service_role;
grant execute on function public.portal_handwerker_angebot_ids() to authenticated, service_role;
grant execute on function public.portal_handwerker_lead_ids() to authenticated, service_role;
grant execute on function public.portal_handwerker_kunde_ids() to authenticated, service_role;

drop policy if exists "angebote_portal_handwerker_select" on public.angebote;
create policy "angebote_portal_handwerker_select"
  on public.angebote for select to authenticated
  using (
    public.is_portal_handwerker()
    and id in (select public.portal_handwerker_angebot_ids())
  );

drop policy if exists "leads_portal_handwerker_select" on public.leads;
create policy "leads_portal_handwerker_select"
  on public.leads for select to authenticated
  using (
    public.is_portal_handwerker()
    and id in (select public.portal_handwerker_lead_ids())
  );

drop policy if exists "kunden_portal_handwerker_select" on public.kunden;
create policy "kunden_portal_handwerker_select"
  on public.kunden for select to authenticated
  using (
    public.is_portal_handwerker()
    and id in (select public.portal_handwerker_kunde_ids())
  );
