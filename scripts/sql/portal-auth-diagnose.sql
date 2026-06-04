-- Portal-Auth Diagnose (Supabase SQL Editor)
-- Hilft bei: keine Bestätigungs-Mail, Login invalid_credentials, Kunde nicht verknüpft

-- 1) Letzte Auth-User (Registrierung / Bestätigung)
select
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  raw_user_meta_data ->> 'name' as name
from auth.users
order by created_at desc
limit 15;

-- 2) Kunde mit gleicher E-Mail verknüpft?
-- (E-Mail unten anpassen)
/*
select id, name, email, auth_user_id, created_at
from public.kunden
where lower(email) = lower('test@beispiel.de');
*/

-- 3) Alte portal_token-Policies (sollten 0 Zeilen sein)
select policyname, qual::text, with_check::text
from pg_policies
where schemaname = 'public'
  and tablename = 'kunden'
  and (
    qual::text ilike '%portal_token%'
    or with_check::text ilike '%portal_token%'
    or policyname ilike '%portal_token%'
  );
