-- CRM: Datenschutz-Hinweis pro Benutzer nur einmal anzeigen
alter table public.user_profiles
  add column if not exists datenschutz_hint_bestaetigt_am timestamptz;

comment on column public.user_profiles.datenschutz_hint_bestaetigt_am is
  'Zeitpunkt Bestätigung des CRM-Datenschutz-Hinweises (Modal)';
