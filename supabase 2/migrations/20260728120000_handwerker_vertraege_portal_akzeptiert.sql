-- Portal: Rahmenvertrag bei Registrierung akzeptiert (Abgleich handwerks-plattform)

alter table public.handwerker_vertraege
  add column if not exists portal_akzeptiert_am timestamptz,
  add column if not exists portal_akzeptiert_auth_user_id uuid;

comment on column public.handwerker_vertraege.portal_akzeptiert_am is
  'Partner hat Rahmenvertrag im Portal akzeptiert (Registrierung oder Profil)';
comment on column public.handwerker_vertraege.portal_akzeptiert_auth_user_id is
  'auth.users.id des Partners bei Annahme im eingeloggten Portal';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'handwerker_vertraege_portal_akzeptiert_auth_user_id_fkey'
  ) then
    alter table public.handwerker_vertraege
      add constraint handwerker_vertraege_portal_akzeptiert_auth_user_id_fkey
      foreign key (portal_akzeptiert_auth_user_id) references auth.users (id) on delete set null;
  end if;
end $$;
