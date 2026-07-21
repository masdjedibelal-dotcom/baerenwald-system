-- One-time impersonation tokens (CRM issuer → Portal /auth/crm-enter)
create table if not exists public.crm_impersonation_tokens (
  jti uuid primary key,
  admin_id uuid not null,
  admin_email text not null,
  target_type text not null,
  target_id text not null,
  target_email text not null,
  role_label text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists crm_impersonation_tokens_expires_idx
  on public.crm_impersonation_tokens (expires_at);

alter table public.crm_impersonation_tokens enable row level security;
-- Service-role only (no policies for authenticated)
