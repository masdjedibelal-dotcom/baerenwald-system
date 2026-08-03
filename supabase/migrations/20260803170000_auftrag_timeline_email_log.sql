-- Auftrag-Timeline ↔ E-Mail-Protokoll (Vorschau in Aktivitäts-Cards)

alter table public.auftrag_timeline
  add column if not exists email_log_id uuid references public.email_log (id) on delete set null;

create index if not exists idx_auftrag_timeline_email_log
  on public.auftrag_timeline (email_log_id);

comment on column public.auftrag_timeline.email_log_id is
  'Verweis auf gespeicherte E-Mail (Vorschau in Verlauf/Aktivität)';
