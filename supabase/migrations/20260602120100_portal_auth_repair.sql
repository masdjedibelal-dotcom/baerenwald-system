-- Reparatur, wenn die Haupt-Migration teilweise fehlgeschlagen ist.
-- Einmal im SQL Editor ausführen, danach 20260602120000_portal_auth_kunden.sql
-- ab Abschnitt 2 erneut (oder komplette Datei).

alter table public.kunden
  add column if not exists auth_user_id uuid;

create unique index if not exists kunden_auth_user_id_unique_idx
  on public.kunden (auth_user_id)
  where auth_user_id is not null;

do $repair$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'kunden_auth_user_id_fkey'
      and conrelid = 'public.kunden'::regclass
  ) then
    alter table public.kunden
      add constraint kunden_auth_user_id_fkey
      foreign key (auth_user_id) references auth.users (id) on delete set null;
  end if;
end $repair$;

create index if not exists kunden_auth_user_id_idx on public.kunden (auth_user_id);

drop policy if exists "portal_kunden" on public.kunden;

alter table public.kunden drop column if exists portal_token;

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'kunden'
  and column_name = 'auth_user_id';
