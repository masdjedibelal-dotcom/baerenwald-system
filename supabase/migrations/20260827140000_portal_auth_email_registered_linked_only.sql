-- Portal-Registrierung: E-Mail gilt nur als „registriert“, wenn Auth-User aktiv
-- mit Kunden-, Handwerker- oder Mitglieder-Stamm verknüpft ist (keine verwaisten Test-Logins).

create or replace function public.portal_auth_email_registered(p_email text)
returns boolean
language sql
security definer
set search_path = auth, public
as $$
  select exists(
    select 1
    from auth.users u
    where lower(u.email) = lower(trim(p_email))
      and u.deleted_at is null
      and (
        exists (
          select 1
          from public.kunden k
          where k.auth_user_id = u.id
        )
        or exists (
          select 1
          from public.handwerker h
          where h.auth_user_id = u.id
        )
        or exists (
          select 1
          from public.kunden_mitglieder m
          where m.auth_user_id = u.id
            and m.aktiv = true
        )
      )
  );
$$;

revoke all on function public.portal_auth_email_registered(text) from public;
grant execute on function public.portal_auth_email_registered(text) to service_role;

comment on function public.portal_auth_email_registered(text) is
  'True nur bei aktivem Auth-User mit Portal-Stammverknüpfung — verwaiste/abgebrochene Registrierungen zählen nicht.';
