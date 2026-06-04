-- Notizen pro Kalender-Termin (Vor-Ort-Dokumentation)
alter table public.lead_notizen
  add column if not exists kalender_termin_id uuid references public.kalender_termine (id) on delete cascade;

alter table public.lead_notizen
  add column if not exists titel text;

create index if not exists lead_notizen_kalender_termin_idx
  on public.lead_notizen (kalender_termin_id);

comment on column public.lead_notizen.kalender_termin_id is 'Optional: Notiz gehört zu einem Termin der Anfrage';
comment on column public.lead_notizen.titel is 'Kurztitel (z. B. bei Termin-Notizen)';
