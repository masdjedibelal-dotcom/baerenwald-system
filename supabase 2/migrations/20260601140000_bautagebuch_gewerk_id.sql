-- Gewerk-Phase pro Bautagebuch-Eintrag (für Kunden-Mail)

alter table public.auftrag_bautagebuch_eintraege
  add column if not exists gewerk_id uuid references public.gewerke (id) on delete set null;

alter table public.auftrag_bautagebuch_eintraege
  add column if not exists gewerk_phase_key text;

comment on column public.auftrag_bautagebuch_eintraege.gewerk_id is 'Aktuelles Gewerk / Phase für die Kunden-Update-Mail';
comment on column public.auftrag_bautagebuch_eintraege.gewerk_phase_key is 'Fallback-Phase-Schlüssel wenn kein Gewerk-Stammdatensatz';
