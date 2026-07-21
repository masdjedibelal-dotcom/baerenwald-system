-- Dedup für proaktive Copilot-Benachrichtigungen (z. B. neue Anfrage)

create table if not exists public.copilot_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  entity_type text not null,
  entity_id text not null,
  sent_at timestamptz not null default now(),
  unique (alert_type, entity_type, entity_id)
);

alter table public.copilot_alerts enable row level security;

create policy copilot_alerts_deny_all on public.copilot_alerts
  for all using (false) with check (false);
