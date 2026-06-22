-- Kalender-Termine (Besichtigung, Baubeginn, …) — falls noch nicht vorhanden

create table if not exists public.kalender_termine (
  id uuid primary key default gen_random_uuid (),
  titel text not null,
  typ text not null default 'sonstiges',
  datum date not null,
  uhrzeit_von time without time zone,
  uhrzeit_bis time without time zone,
  adresse text,
  beschreibung text,
  erledigt boolean not null default false,
  lead_id uuid references public.leads (id) on delete set null,
  auftrag_id uuid references public.auftraege (id) on delete set null,
  created_at timestamptz not null default now ()
);

create index if not exists idx_kalender_termine_datum on public.kalender_termine (datum);
create index if not exists idx_kalender_termine_lead on public.kalender_termine (lead_id);
create index if not exists idx_kalender_termine_auftrag on public.kalender_termine (auftrag_id);

alter table public.kalender_termine enable row level security;

drop policy if exists "kalender_termine_auth_all" on public.kalender_termine;
create policy "kalender_termine_auth_all"
  on public.kalender_termine
  for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

comment on table public.kalender_termine is 'CRM-Kalender: Termine zu Leads oder Aufträgen';
