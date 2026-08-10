-- PWA Web Push: Subscriptions + Prefs pro CRM-User

create table if not exists public.crm_push_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  push_enabled boolean not null default false,
  neue_anfragen boolean not null default true,
  handwerker_updates boolean not null default true,
  angebot_entscheidungen boolean not null default true,
  anstehende_abnahmen boolean not null default true,
  auftrag_partner boolean not null default true,
  ueberfaellige_rechnungen boolean not null default true,
  system_updates boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (endpoint)
);

create index if not exists idx_crm_push_subscriptions_user
  on public.crm_push_subscriptions (user_id);

alter table public.crm_push_prefs enable row level security;
alter table public.crm_push_subscriptions enable row level security;

drop policy if exists "crm_push_prefs_own" on public.crm_push_prefs;
create policy "crm_push_prefs_own"
  on public.crm_push_prefs
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "crm_push_subscriptions_own" on public.crm_push_subscriptions;
create policy "crm_push_subscriptions_own"
  on public.crm_push_subscriptions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.crm_push_prefs is
  'CRM PWA-Push: Master + Event-Switches pro Staff-User';
comment on table public.crm_push_subscriptions is
  'Web-Push-Subscriptions (Home-Screen-PWA) pro Gerät/User';
