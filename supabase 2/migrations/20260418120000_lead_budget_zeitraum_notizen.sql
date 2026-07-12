-- Budget, Bereiche-Sonstiges, Zeitraum als Datum, Vor-Ort-Notiz (Lead)
alter table public.leads
  add column if not exists budget_ca numeric(10, 2);

alter table public.leads
  add column if not exists bereiche_sonstiges text;

alter table public.leads
  add column if not exists zeitraum_von date;

alter table public.leads
  add column if not exists zeitraum_bis date;

alter table public.leads
  add column if not exists vor_ort_notizen text;

-- Tabellarische Notizen pro Lead
create table if not exists public.lead_notizen (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  inhalt text not null,
  datei_url text,
  erstellt_von uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists lead_notizen_lead_idx on public.lead_notizen (lead_id);

alter table public.lead_notizen enable row level security;

drop policy if exists "lead_notizen_authenticated_all" on public.lead_notizen;

create policy "lead_notizen_authenticated_all"
  on public.lead_notizen
  for all
  to authenticated
  using (true)
  with check (true);
