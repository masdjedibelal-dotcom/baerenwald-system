-- Abnahme-Mängel ↔ Punch-List + Protokoll-Versionen

alter table public.punch_list
  add column if not exists abnahme_punkt_id text,
  add column if not exists protokoll_id uuid references public.auftrag_abnahmeprotokolle (id) on delete set null;

create unique index if not exists punch_list_abnahme_punkt_uq
  on public.punch_list (auftrag_id, abnahme_punkt_id)
  where abnahme_punkt_id is not null;

alter table public.auftrag_abnahmeprotokolle
  add column if not exists protokoll_typ text not null default 'erstabnahme';

comment on column public.punch_list.abnahme_punkt_id is
  'Verknüpfung zum Checklisten-Punkt im Abnahmeprotokoll (JSON punkt_id).';
comment on column public.auftrag_abnahmeprotokolle.protokoll_typ is
  'erstabnahme | nachabnahme | schlussabnahme';
