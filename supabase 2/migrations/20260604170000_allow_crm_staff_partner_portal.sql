-- Partner-Portal: CRM-Mitarbeiter dürfen sich als verknüpfter Handwerker einloggen
-- (analog Kundenportal — gleiche E-Mail im Stamm reicht)

comment on column public.handwerker.auth_user_id is
  'Supabase Auth User des Partner-Portals. Auch CRM-Mitarbeiter, wenn im Partner-Stamm verknüpft.';

create or replace function public.is_portal_handwerker()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.portal_handwerker_id() is not null;
$$;

drop policy if exists "handwerker_portal_select_own" on public.handwerker;
create policy "handwerker_portal_select_own"
  on public.handwerker for select to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists "handwerker_portal_update_own" on public.handwerker;
create policy "handwerker_portal_update_own"
  on public.handwerker for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

drop policy if exists "angebot_handwerker_portal_select" on public.angebot_handwerker;
create policy "angebot_handwerker_portal_select"
  on public.angebot_handwerker for select to authenticated
  using (handwerker_id = public.portal_handwerker_id());

drop policy if exists "angebot_handwerker_portal_update" on public.angebot_handwerker;
create policy "angebot_handwerker_portal_update"
  on public.angebot_handwerker for update to authenticated
  using (handwerker_id = public.portal_handwerker_id())
  with check (handwerker_id = public.portal_handwerker_id());
