-- Timeline ↔ E-Mail-Protokoll verknüpfen + Anhang-Metadaten

alter table public.lead_timeline
  add column if not exists email_log_id uuid references public.email_log (id) on delete set null;

create index if not exists idx_lead_timeline_email_log
  on public.lead_timeline (email_log_id);

alter table public.email_log
  add column if not exists anhang_dateiname text;

comment on column public.lead_timeline.email_log_id is 'Verweis auf gespeicherte E-Mail (Vorschau in Timeline)';
comment on column public.email_log.anhang_dateiname is 'Dateiname des PDF-Anhangs beim Versand';
