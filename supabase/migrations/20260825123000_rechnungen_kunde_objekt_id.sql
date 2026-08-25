-- Ausführungsort (Verwaltungsobjekt) auch an der Rechnung — z. B. Direktrechnung ohne Angebot.

alter table public.rechnungen
  add column if not exists kunde_objekt_id uuid
    references public.kunden_objekte (id) on delete set null;

create index if not exists rechnungen_kunde_objekt_id_idx
  on public.rechnungen (kunde_objekt_id)
  where kunde_objekt_id is not null;

comment on column public.rechnungen.kunde_objekt_id is
  'Ausführungsort / Verwaltungsobjekt (PDF „Durchführung in“). Null = kein Objekt.';
