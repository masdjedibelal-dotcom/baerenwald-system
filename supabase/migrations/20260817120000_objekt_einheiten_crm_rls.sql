-- CRM-Staff darf Einheiten anlegen/ändern (wie einheit_bewohner_crm).
-- Bisher nur Portal-Org + service_role → Insert aus CRM schlug mit RLS fehl.

drop policy if exists objekt_einheiten_crm on public.objekt_einheiten;

create policy objekt_einheiten_crm on public.objekt_einheiten
  for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());
