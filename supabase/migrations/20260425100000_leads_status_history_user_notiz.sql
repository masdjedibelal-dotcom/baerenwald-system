-- App: updateLeadStatus / API-Lead schreiben user_id + notiz in leads_status_history

alter table public.leads_status_history
  add column if not exists user_id uuid references auth.users (id) on delete set null;

alter table public.leads_status_history
  add column if not exists notiz text;

comment on column public.leads_status_history.user_id is 'CRM-Nutzer:in, die den Status geändert hat (null bei System/API)';
comment on column public.leads_status_history.notiz is 'Optionale Notiz zum Statuswechsel';
