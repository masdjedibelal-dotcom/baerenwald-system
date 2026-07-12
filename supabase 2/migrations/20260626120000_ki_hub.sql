-- KI Hub: Empfehlungen, System-Events, Marketing-Metriken, Content

create table if not exists public.system_events (
  id uuid primary key default gen_random_uuid(),
  quelle text not null,
  event_typ text not null,
  severity text not null default 'info',
  details jsonb,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_system_events_created
  on public.system_events (created_at desc);

create table if not exists public.marketing_metrics (
  id uuid primary key default gen_random_uuid(),
  quelle text not null,
  metrik text not null,
  wert jsonb not null default '{}'::jsonb,
  zeitraum_start date,
  zeitraum_end date,
  created_at timestamptz not null default now()
);

create index if not exists idx_marketing_metrics_quelle_created
  on public.marketing_metrics (quelle, created_at desc);

create table if not exists public.ki_empfehlungen (
  id uuid primary key default gen_random_uuid(),
  bereich text not null,
  prioritaet text not null default 'mittel',
  titel text not null,
  beschreibung text,
  daten_basis jsonb,
  content jsonb,
  aktion_typ text,
  aktion_payload jsonb,
  gesehen boolean not null default false,
  umgesetzt boolean not null default false,
  umgesetzt_at timestamptz,
  analyse_lauf timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_ki_empfehlungen_analyse
  on public.ki_empfehlungen (analyse_lauf desc, prioritaet);

create index if not exists idx_ki_empfehlungen_offen
  on public.ki_empfehlungen (umgesetzt, created_at desc)
  where umgesetzt = false;

create table if not exists public.ki_content (
  id uuid primary key default gen_random_uuid(),
  empfehlung_id uuid references public.ki_empfehlungen(id) on delete set null,
  typ text not null,
  text_content text,
  bild_url text,
  bild_prompt text,
  status text not null default 'generiert',
  publiziert_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.system_events enable row level security;
alter table public.marketing_metrics enable row level security;
alter table public.ki_empfehlungen enable row level security;
alter table public.ki_content enable row level security;

-- CRM-Nutzer: lesen + Empfehlungen als erledigt markieren
drop policy if exists ki_empfehlungen_auth_select on public.ki_empfehlungen;
create policy ki_empfehlungen_auth_select on public.ki_empfehlungen
  for select to authenticated using (true);

drop policy if exists ki_empfehlungen_auth_update on public.ki_empfehlungen;
create policy ki_empfehlungen_auth_update on public.ki_empfehlungen
  for update to authenticated using (true) with check (true);

drop policy if exists ki_content_auth_select on public.ki_content;
create policy ki_content_auth_select on public.ki_content
  for select to authenticated using (true);

drop policy if exists system_events_auth_select on public.system_events;
create policy system_events_auth_select on public.system_events
  for select to authenticated using (true);

drop policy if exists marketing_metrics_auth_select on public.marketing_metrics;
create policy marketing_metrics_auth_select on public.marketing_metrics
  for select to authenticated using (true);
