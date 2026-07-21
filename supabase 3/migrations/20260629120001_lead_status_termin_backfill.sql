-- Nach 20260629120000: Leads mit offenem Besichtigungstermin auf Status „termin“ setzen.

update public.leads l
set status = 'termin',
    updated_at = now()
where l.status = 'kontaktiert'
  and exists (
    select 1
    from public.kalender_termine kt
    where kt.lead_id = l.id
      and kt.typ = 'besichtigung'
      and coalesce(kt.erledigt, false) = false
  );
