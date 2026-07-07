-- KI-Cluster-Analysen: gespeicherte Auswertungen pro Bereich (Dashboard)

create table if not exists public.ki_cluster_analysen (
  id uuid primary key default gen_random_uuid(),
  bereich text not null,
  analyse_key text not null,
  titel text not null,
  ergebnis jsonb not null default '{}'::jsonb,
  narrative text,
  sample_size integer not null default 0,
  generiert_am timestamptz not null default now(),
  gueltig_bis timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bereich, analyse_key)
);

create index if not exists idx_ki_cluster_analysen_bereich
  on public.ki_cluster_analysen (bereich, generiert_am desc);

comment on table public.ki_cluster_analysen is
  'KI-/SQL-Analysen je Cluster (Preise, Handwerker, Funnel …) für /ki-analytics';

alter table public.ki_cluster_analysen enable row level security;

drop policy if exists "ki_cluster_analysen_auth_select" on public.ki_cluster_analysen;
create policy "ki_cluster_analysen_auth_select"
  on public.ki_cluster_analysen
  for select
  to authenticated
  using (auth.role() = 'authenticated');

drop policy if exists "ki_cluster_analysen_auth_all" on public.ki_cluster_analysen;
create policy "ki_cluster_analysen_auth_all"
  on public.ki_cluster_analysen
  for all
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
