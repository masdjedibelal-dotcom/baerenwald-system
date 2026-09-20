-- P3-3: crm_vorgaenge_lead_page für echte Seitenblätterung
-- Entfernt den Hard-Cap 200 als Seitengröße-Maximum (war faktisch Listen-Limit).
-- Neu: optional p_lead_ids (Handwerker-Scope).

drop function if exists public.crm_vorgaenge_lead_page(integer, integer, uuid, uuid);

create or replace function public.crm_vorgaenge_lead_page(
  p_limit integer default 50,
  p_offset integer default 0,
  p_kunde_id uuid default null,
  p_objekt_id uuid default null,
  p_lead_ids uuid[] default null
)
returns table(id uuid, updated_at timestamptz, total_count bigint)
language sql
stable
set search_path = public
as $$
  with filtered as (
    select l.id, l.updated_at
    from public.leads l
    where l.geloescht_am is null
      and (p_kunde_id is null or l.kunde_id = p_kunde_id or l.auftraggeber_kunde_id = p_kunde_id)
      and (p_objekt_id is null or l.kunde_objekt_id = p_objekt_id)
      and (p_lead_ids is null or l.id = any (p_lead_ids))
  ),
  counted as (
    select count(*)::bigint as total_count from filtered
  )
  select f.id, f.updated_at, c.total_count
  from filtered f
  cross join counted c
  order by f.updated_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

revoke all on function public.crm_vorgaenge_lead_page(integer, integer, uuid, uuid, uuid[]) from public;
grant execute on function public.crm_vorgaenge_lead_page(integer, integer, uuid, uuid, uuid[]) to authenticated, service_role;
