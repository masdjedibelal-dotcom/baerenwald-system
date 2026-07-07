-- Telegram Copilot: Konversationsverlauf (Service Role / Server)

create table if not exists public.copilot_messages (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_copilot_messages_created_at
  on public.copilot_messages (created_at desc);

comment on table public.copilot_messages is 'Bärenwald Copilot (Telegram): Chat-Verlauf für Claude';

alter table public.copilot_messages enable row level security;

drop policy if exists "copilot_messages_deny_all" on public.copilot_messages;
create policy "copilot_messages_deny_all"
  on public.copilot_messages
  for all
  to authenticated
  using (false)
  with check (false);
