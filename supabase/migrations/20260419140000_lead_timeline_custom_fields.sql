-- Lead-Timeline (CRM-Aktivitäten) + Custom Fields für Leads/Kunden/Aufträge

create table if not exists public.lead_timeline (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  typ text not null,
  titel text not null,
  beschreibung text,
  erstellt_von uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_timeline_lead
  on public.lead_timeline (lead_id, created_at desc);

comment on table public.lead_timeline is 'Chronologische Einträge zur Anfrage (Auto-Log + manuelle Notizen)';

alter table public.lead_timeline enable row level security;

drop policy if exists "lead_timeline_auth_all" on public.lead_timeline;
create policy "lead_timeline_auth_all"
  on public.lead_timeline
  for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

-- ---------------------------------------------------------------------------
-- Custom Field Definitions & Values
-- ---------------------------------------------------------------------------

create table if not exists public.custom_field_definitions (
  id uuid primary key default gen_random_uuid(),
  objekt_typ text not null,
  label text not null,
  feld_typ text not null,
  optionen jsonb,
  pflicht boolean not null default false,
  sort_order int not null default 0,
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_custom_field_def_objekt
  on public.custom_field_definitions (objekt_typ, sort_order);

create table if not exists public.custom_field_values (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.custom_field_definitions (id) on delete cascade,
  objekt_id uuid not null,
  wert text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (definition_id, objekt_id)
);

create index if not exists idx_custom_field_values_objekt
  on public.custom_field_values (objekt_id);

alter table public.custom_field_definitions enable row level security;
alter table public.custom_field_values enable row level security;

drop policy if exists "custom_field_definitions_auth_all" on public.custom_field_definitions;
create policy "custom_field_definitions_auth_all"
  on public.custom_field_definitions
  for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

drop policy if exists "custom_field_values_auth_all" on public.custom_field_values;
create policy "custom_field_values_auth_all"
  on public.custom_field_values
  for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');
