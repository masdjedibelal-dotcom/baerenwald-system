-- =============================================================================
-- EINMAL IM SUPABASE SQL EDITOR AUSFÜHREN
-- Behebt: column "portal_token" does not exist (alte RLS nach Spalten-Drop)
-- =============================================================================

-- 1) Alle kunden-Policies entfernen, die portal_token im Ausdruck oder Namen nutzen
do $$
declare
  r record;
  qual_text text;
  check_text text;
begin
  for r in
    select p.polname as policy_name,
           p.polrelid as relid,
           p.polqual,
           p.polwithcheck
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'kunden'
  loop
    qual_text := coalesce(pg_get_expr(r.polqual, r.relid), '');
    check_text := coalesce(pg_get_expr(r.polwithcheck, r.relid), '');

    if qual_text ilike '%portal_token%'
       or check_text ilike '%portal_token%'
       or r.policy_name ilike '%portal_token%'
       or r.policy_name ilike 'portal_kunden%'
    then
      execute format('drop policy if exists %I on public.kunden', r.policy_name);
      raise notice 'Dropped policy %', r.policy_name;
    end if;
  end loop;
end $$;

drop policy if exists "portal_kunden" on public.kunden;

-- 2) Spalte nur droppen wenn noch vorhanden (Reparatur halb erledigt)
alter table public.kunden drop column if exists portal_token;

-- 3) auth_user_id + Hilfsfunktionen (falls Hauptmigration abgebrochen)
alter table public.kunden add column if not exists auth_user_id uuid;

create or replace function public.is_crm_staff()
returns boolean
language sql
stable
security definer
set search_path = public
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
as $$
  select id from public.kunden where auth_user_id = auth.uid() limit 1;
$$;

revoke all on function public.is_crm_staff() from public;
revoke all on function public.portal_kunde_id() from public;
grant execute on function public.is_crm_staff() to authenticated, service_role;
grant execute on function public.portal_kunde_id() to authenticated, service_role;

-- 4) CRM darf kunden wieder lesen/schreiben
drop policy if exists "kunden_crm_staff_all" on public.kunden;
create policy "kunden_crm_staff_all"
  on public.kunden for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

-- 5) Portal-Policies (auth_user_id, kein portal_token)
drop policy if exists "kunden_portal_select_own" on public.kunden;
create policy "kunden_portal_select_own"
  on public.kunden for select to authenticated
  using (auth_user_id = auth.uid() and not public.is_crm_staff());

drop policy if exists "kunden_portal_update_own" on public.kunden;
create policy "kunden_portal_update_own"
  on public.kunden for update to authenticated
  using (auth_user_id = auth.uid() and not public.is_crm_staff())
  with check (auth_user_id = auth.uid() and not public.is_crm_staff());

-- Prüfung
select policyname, qual::text, with_check::text
from pg_policies
where schemaname = 'public' and tablename = 'kunden'
order by policyname;
