-- CRM To-dos (getrennt von kalender_termine)

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid (),
  titel text not null,
  beschreibung text,
  erledigt boolean not null default false,
  erledigt_at timestamptz,
  faellig_am date,
  prioritaet text not null default 'normal'
    check (prioritaet in ('niedrig', 'normal', 'hoch')),
  zugewiesen_an uuid references auth.users (id) on delete set null,
  kunde_id uuid references public.kunden (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  auftrag_id uuid references public.auftraege (id) on delete set null,
  handwerker_id uuid references public.handwerker (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create index if not exists idx_todos_erledigt_faellig on public.todos (erledigt, faellig_am);
create index if not exists idx_todos_zugewiesen on public.todos (zugewiesen_an);
create index if not exists idx_todos_kunde on public.todos (kunde_id);
create index if not exists idx_todos_lead on public.todos (lead_id);
create index if not exists idx_todos_auftrag on public.todos (auftrag_id);
create index if not exists idx_todos_handwerker on public.todos (handwerker_id);

alter table public.todos enable row level security;

drop policy if exists "todos_auth_all" on public.todos;
create policy "todos_auth_all"
  on public.todos
  for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

comment on table public.todos is 'CRM-Aufgaben: abhakbar, zuweisbar, optional verknüpft mit Kunde/Vorgang/Handwerker';
