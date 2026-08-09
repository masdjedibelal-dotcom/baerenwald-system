-- Lernspeicher für Angebots-KI: akzeptierte Generierungen als Beispiele für spätere Prompts

create table if not exists public.angebot_ki_beispiele (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  scope text not null,
  prompt text not null,
  gewerk_slug text,
  kontext jsonb not null default '{}'::jsonb,
  ergebnis jsonb not null default '{}'::jsonb,
  akzeptiert boolean not null default true,
  user_id uuid
);

create index if not exists idx_angebot_ki_beispiele_scope on public.angebot_ki_beispiele (scope);
create index if not exists idx_angebot_ki_beispiele_gewerk on public.angebot_ki_beispiele (gewerk_slug);
create index if not exists idx_angebot_ki_beispiele_created on public.angebot_ki_beispiele (created_at desc);

comment on table public.angebot_ki_beispiele is
  'Akzeptierte KI-Ausgaben im Angebots-Wizard — Few-Shot-Lernen für spätere Generierungen';

alter table public.angebot_ki_beispiele enable row level security;

drop policy if exists "angebot_ki_beispiele_auth_all" on public.angebot_ki_beispiele;
create policy "angebot_ki_beispiele_auth_all"
  on public.angebot_ki_beispiele for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
