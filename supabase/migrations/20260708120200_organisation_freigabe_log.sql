create table if not exists public.org_freigabe_log (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete cascade,
  angebot_id uuid references public.angebote (id) on delete set null,
  auftraggeber_kunde_id uuid not null references public.kunden (id) on delete cascade,
  aktion text not null check (aktion in ('angefordert', 'freigegeben', 'abgelehnt')),
  betrag_eur numeric,
  notiz text,
  erstellt_von text,
  created_at timestamptz not null default now()
);

create index if not exists org_freigabe_log_lead_idx on public.org_freigabe_log (lead_id);
alter table public.org_freigabe_log enable row level security;

drop policy if exists "org_freigabe_log_portal_select" on public.org_freigabe_log;
create policy "org_freigabe_log_portal_select"
  on public.org_freigabe_log for select to authenticated
  using (auftraggeber_kunde_id = public.portal_kunde_id());
