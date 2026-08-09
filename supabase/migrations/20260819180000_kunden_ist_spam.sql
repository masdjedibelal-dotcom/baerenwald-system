-- Kunden als Spam markieren: Rechner-/Portal-Sperre über Flag + Auth-Ban im CRM

alter table public.kunden
  add column if not exists ist_spam boolean not null default false;

alter table public.kunden
  add column if not exists spam_markiert_am timestamptz null;

comment on column public.kunden.ist_spam is
  'Wenn true: keine neuen Anfragen über Rechner/Website, kein Portal-Login/-Register mit dieser E-Mail.';

comment on column public.kunden.spam_markiert_am is
  'Zeitpunkt der Spam-Markierung (null wenn nicht Spam).';

create index if not exists kunden_ist_spam_email_idx
  on public.kunden (lower(email))
  where ist_spam = true and email is not null;
