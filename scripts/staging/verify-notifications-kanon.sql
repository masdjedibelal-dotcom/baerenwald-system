-- Staging-Verifikation nach 20261211120000_notifications_kanon.sql
-- Nutzung: ./scripts/staging/apply-sql-to-staging.sh supabase/migrations/20261211120000_notifications_kanon.sql scripts/staging/verify-notifications-kanon.sql

\echo '==> Tabellen'
select
  to_regclass('public.notifications') as notifications,
  to_regclass('public.partner_notifications') as partner_notifications,
  to_regclass('public.hv_notifications') as hv_notifications,
  to_regclass('public.portal_notifications') as portal_notifications,
  to_regclass('public.crm_notification_reads') as crm_notification_reads;

\echo '==> Spalten notifications'
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'notifications'
order by ordinal_position;

\echo '==> RLS an?'
select c.relname, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('notifications', 'partner_notifications')
order by 1;

\echo '==> Policies notifications'
select polname, cmd::text
from pg_policy
where polrelid = 'public.notifications'::regclass
order by 1;

\echo '==> Smoke insert/delete (service_role context via table owner / bypass in psql as postgres)'
do $$
declare
  uid uuid;
  nid uuid;
begin
  select id into uid from auth.users limit 1;
  if uid is null then
    raise notice 'SKIP smoke: kein auth.users';
    return;
  end if;
  insert into public.notifications (
    empfaenger_id, rolle, ereignis_id, titel, text, link
  ) values (
    uid, 'staff', 'anfrage.neu', 'Neue Anfrage', 'Staging-Smoke', '/anfragen'
  ) returning id into nid;
  update public.notifications set gelesen_am = now() where id = nid;
  delete from public.notifications where id = nid;
  raise notice 'OK smoke insert/update/delete id=%', nid;
end $$;
