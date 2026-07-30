-- Optional: Termin direkt an Kunde hängen (neben Lead/Auftrag)

alter table public.kalender_termine
  add column if not exists kunde_id uuid references public.kunden (id) on delete set null;

create index if not exists idx_kalender_termine_kunde
  on public.kalender_termine (kunde_id);

comment on column public.kalender_termine.kunde_id is
  'Optionaler Kundenbezug; Adresse kann beim Anlegen übernommen werden.';
