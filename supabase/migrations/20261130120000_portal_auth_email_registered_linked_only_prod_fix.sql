-- Prod hatte noch die alte Variante (nur auth.users.exists).
-- Korrekt: nur „registriert“, wenn Auth mit Kunde/HW/Mitglied verknüpft ist.
-- Sonst blockiert CRM-Kundenlöschung die erneute Portal-Registrierung.

create or replace function public.portal_auth_email_registered(p_email text)
returns boolean
language sql
security definer
set search_path = auth, public
set row_security = off
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

comment on function public.portal_auth_email_registered(text) is
  'True nur bei aktivem Auth-User mit Portal-Stammverknüpfung — verwaiste Auth nach CRM-Löschung zählen nicht.';
