-- Junction: ein Tagebuch-Eintrag kann 0..n Leistungen betreffen.
-- Parent: position_eintraege (position_id null + auftrag_id für freie Notiz möglich).

create table if not exists public.position_eintrag_leistungen (
  eintrag_id uuid not null references public.position_eintraege (id) on delete cascade,
  position_id uuid not null references public.auftrag_positionen (id) on delete cascade,
  primary key (eintrag_id, position_id)
);

create index if not exists position_eintrag_leistungen_position_idx
  on public.position_eintrag_leistungen (position_id);

comment on table public.position_eintrag_leistungen is
  'M:N — Bautagebuch-/Positions-Eintrag betrifft optionale Leistungen (0..n).';

alter table public.position_eintrag_leistungen enable row level security;

-- CRM/Service-Role schreibt via Admin; Portal-Partner liest über eigene Policies später.
drop policy if exists position_eintrag_leistungen_select_authenticated on public.position_eintrag_leistungen;
create policy position_eintrag_leistungen_select_authenticated
  on public.position_eintrag_leistungen
  for select
  to authenticated
  using (true);
