-- App nutzt LeadStatus „termin“ (Termin vereinbart); fehlte im Postgres-Enum lead_status.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'lead_status'
      and e.enumlabel = 'termin'
  ) then
    alter type public.lead_status add value 'termin' after 'kontaktiert';
  end if;
end
$$;
