-- Portal: Angebote erst nach Versand sichtbar (nicht schon nach Wizard-Speichern).
-- Rechnungen: bleiben wie bisher (status = 'gesendet').

-- Kundenportal: nur gesendete / beantwortete Angebote
drop policy if exists "angebote_portal_select" on public.angebote;
create policy "angebote_portal_select"
  on public.angebote for select to authenticated
  using (
    not public.is_crm_staff()
    and lead_id in (select public.portal_kunde_lead_ids())
    and (
      gesendet_kunde_at is not null
      or gesendet_am is not null
      or status_einfach in ('gesendet', 'angenommen', 'abgelehnt', 'abgelaufen')
      or status::text in (
        'gesendet_kunde',
        'kunde_akzeptiert',
        'kunde_abgelehnt',
        'angenommen',
        'abgelehnt'
      )
    )
  );

-- Handwerkerportal: nur Anfragen, die wirklich versendet wurden
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
  where ah.handwerker_id = public.portal_handwerker_id()
    and ah.gesendet_at is not null;
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
    and ah.gesendet_at is not null
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
    and ah.gesendet_at is not null
    and a.kunde_id is not null;
$$;

drop policy if exists "angebot_handwerker_portal_select" on public.angebot_handwerker;
create policy "angebot_handwerker_portal_select"
  on public.angebot_handwerker for select to authenticated
  using (
    handwerker_id = public.portal_handwerker_id()
    and gesendet_at is not null
  );

drop policy if exists "angebot_handwerker_portal_update" on public.angebot_handwerker;
create policy "angebot_handwerker_portal_update"
  on public.angebot_handwerker for update to authenticated
  using (
    not public.is_crm_staff()
    and handwerker_id = public.portal_handwerker_id()
    and gesendet_at is not null
  )
  with check (
    not public.is_crm_staff()
    and handwerker_id = public.portal_handwerker_id()
    and gesendet_at is not null
  );
