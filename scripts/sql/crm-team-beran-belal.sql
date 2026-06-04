-- CRM-Mitarbeiter: Beran Cakmak + Belal Masdjedi (gleiche Bärenwald-Handynummer)
-- Supabase → SQL Editor (postgres / service role)
--
-- Voraussetzung:
--   Migration 20260604120000_kalender_zugewiesen_user_telefon.sql
--   Beide Personen sind bereits unter Einstellungen → Team angelegt (Auth-User existiert)
--
-- Zuordnung nur über den Namen — keine E-Mail nötig.
-- Handy ggf. unten in v_handy anpassen.

begin;

do $$
declare
  v_handy text := '+49 163 7316161';
  v_name text;
  v_uid uuid;
  v_names text[] := array['Beran Cakmak', 'Belal Masdjedi'];
begin
  foreach v_name in array v_names
  loop
    select u.id into v_uid
    from auth.users u
    left join public.user_profiles up on up.id = u.id
    where up.name = v_name
       or (u.raw_user_meta_data ->> 'name') = v_name
    order by (up.id is not null) desc
    limit 1;

    if v_uid is null then
      raise notice 'Nicht gefunden: % — bitte zuerst im CRM unter Team anlegen/einladen.', v_name;
      continue;
    end if;

    update auth.users
    set
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('name', v_name, 'role', 'admin', 'telefon', v_handy),
      updated_at = now()
    where id = v_uid;

    insert into public.user_profiles (id, name, telefon)
    values (v_uid, v_name, v_handy)
    on conflict (id) do update set
      name = excluded.name,
      telefon = excluded.telefon;

    raise notice 'OK: % (id %)', v_name, v_uid;
  end loop;
end $$;

commit;

-- Kontrolle
select
  up.id,
  up.name,
  up.telefon,
  u.raw_user_meta_data ->> 'role' as rolle
from public.user_profiles up
join auth.users u on u.id = up.id
where up.name in ('Beran Cakmak', 'Belal Masdjedi')
order by up.name;
