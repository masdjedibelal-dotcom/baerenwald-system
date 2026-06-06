-- Freitext-Kundenmail, Vorlagen, Antwort-Tracking

create table if not exists public.kommunikation_mail_vorlagen (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  kontext_typ text not null default 'alle',
  betreff text not null default '',
  body_text text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

alter table public.kommunikation_mail_vorlagen enable row level security;

drop policy if exists "kommunikation_mail_vorlagen_auth_all" on public.kommunikation_mail_vorlagen;
create policy "kommunikation_mail_vorlagen_auth_all"
  on public.kommunikation_mail_vorlagen for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

create index if not exists kommunikation_mail_vorlagen_kontext_idx
  on public.kommunikation_mail_vorlagen (kontext_typ, sort_order);

alter table public.email_log
  add column if not exists kontext_typ text,
  add column if not exists richtung text not null default 'gesendet',
  add column if not exists cc_email text,
  add column if not exists von_email text,
  add column if not exists in_reply_to_log_id uuid references public.email_log (id) on delete set null,
  add column if not exists internet_message_id text;

create index if not exists email_log_lead_idx on public.email_log (lead_id);
create index if not exists email_log_angebot_idx on public.email_log (angebot_id);
create index if not exists email_log_rechnung_idx on public.email_log (rechnung_id);
create index if not exists email_log_in_reply_idx on public.email_log (in_reply_to_log_id);
create index if not exists email_log_internet_message_id_idx on public.email_log (internet_message_id);

comment on column public.email_log.kontext_typ is 'anfrage|angebot|auftrag|rechnung|kunde — UI-Kontext der Freitext-Mail';
comment on column public.email_log.richtung is 'gesendet|empfangen';
comment on column public.kommunikation_mail_vorlagen.kontext_typ is 'anfrage|angebot|auftrag|rechnung|kunde|alle';
