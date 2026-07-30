-- Gelesen-Status für CRM-Staff-Benachrichtigungen (aggregiert aus Leads / HW-Updates / Abschlüssen)

create table if not exists public.crm_notification_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  source_key text not null,
  read_at timestamptz not null default now(),
  primary key (user_id, source_key)
);

create index if not exists idx_crm_notification_reads_user
  on public.crm_notification_reads (user_id, read_at desc);

alter table public.crm_notification_reads enable row level security;

drop policy if exists "crm_notification_reads_own" on public.crm_notification_reads;
create policy "crm_notification_reads_own"
  on public.crm_notification_reads
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.crm_notification_reads is
  'CRM-Inbox: gelesen pro User, source_key z. B. neue_anfrage:{leadId}';
