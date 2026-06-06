-- Kundenportal: Ansprechpartner-Kontakt aus Team-Profilen (Betreuer am Auftrag)

update public.user_profiles up
set email = u.email
from auth.users u
where u.id = up.id
  and u.email is not null
  and (up.email is null or btrim(up.email) = '');

update public.user_profiles
set phone = telefon
where telefon is not null
  and btrim(telefon) <> ''
  and (phone is null or btrim(phone) = '');
