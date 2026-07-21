-- Vor-Ort-Termin: zuständiger Mitarbeiter + Handynummer in Profilen

alter table public.kalender_termine
  add column if not exists zugewiesen_an uuid references auth.users (id) on delete set null;

create index if not exists idx_kalender_termine_zugewiesen
  on public.kalender_termine (zugewiesen_an);

comment on column public.kalender_termine.zugewiesen_an is
  'CRM-Mitarbeiter:in für Vor-Ort-Termin (Kalender + Kunden-Mail)';

alter table public.user_profiles
  add column if not exists telefon text;

comment on column public.user_profiles.telefon is
  'Handy / Direktwahl für Kunden-Kommunikation und Termin-Mails';
