-- Nur PRÜFEN — nicht ausführen, wenn is_crm_staff fehlt → zuerst fix-portal-token-not-exists.sql

select
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_crm_staff'
  ) as is_crm_staff_exists;

-- Erwartung: is_crm_staff_exists = true
-- Wenn false: scripts/sql/fix-portal-token-not-exists.sql ausführen
