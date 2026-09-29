-- P03: Tabellen und Spalten, die der CRM-Code nutzt, deren Original-Migrationen aber nie in Prod
-- eingespielt wurden (Prod-Schema 29.09.2026 geprüft). Nur die gebrauchten Teile, alles idempotent.
-- Quellen: 20260419100000_datenschutz.sql, 20260422140000_settings_extras.sql,
--          20260605120000_kommunikation_mail.sql, 20260602120000_auftrag_handwerker_compliance_pflicht.sql,
--          20260617120000_compliance_vertraege_portal.sql

-- Datenschutz: Aufschub der Löschfrist
create table if not exists public.datenschutz_aufschub (
  id uuid primary key default gen_random_uuid(),
  kategorie text not null,
  referenz_id uuid not null,
  gueltig_bis date not null,
  begrundung text,
  erstellt_von uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists datenschutz_aufschub_ref_idx
  on public.datenschutz_aufschub (kategorie, referenz_id, gueltig_bis desc);

alter table public.datenschutz_aufschub enable row level security;
drop policy if exists "datenschutz_aufschub_auth_all" on public.datenschutz_aufschub;
create policy "datenschutz_aufschub_auth_all"
  on public.datenschutz_aufschub for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

-- Einstellungen: E-Mail-Vorlagen (mit Standardtexten)
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid (),
  slug text not null unique,
  name text not null,
  beschreibung text,
  betreff text not null default '',
  body_html text not null default '',
  updated_at timestamptz not null default now ()
);

alter table public.email_templates enable row level security;

drop policy if exists "email_templates_auth_all" on public.email_templates;
create policy "email_templates_auth_all"
  on public.email_templates for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

insert into public.email_templates (slug, name, beschreibung, betreff, body_html)
values
  (
    'lead_bestaetigung',
    'Lead-Bestätigung',
    'Nach Eingang einer Anfrage',
    'Ihre Anfrage bei {{kundenname}}',
    '<p>Hallo {{kundenname}},</p><p>vielen Dank für Ihre Anfrage.</p>'
  ),
  (
    'angebot_kunde',
    'Angebot an Kunden',
    'Versand des Angebots',
    'Ihr Angebot von Bärenwald',
    '<p>Guten Tag {{kundenname}},</p><p>im Anhang/Ihr Link: {{link}}</p>'
  ),
  (
    'auftrag_bestaetigung',
    'Auftragsbestätigung',
    'Nach Auftragsvergabe',
    'Auftragsbestätigung',
    '<p>Hallo {{kundenname}},</p><p>Ihr Auftrag wurde bestätigt.</p>'
  ),
  (
    'status_update',
    'Status-Update',
    'Projektstatus',
    'Update zu Ihrem Projekt',
    '<p>Hallo {{kundenname}},</p><p>Neuer Stand: …</p>'
  ),
  (
    'rechnung',
    'Rechnung',
    'Rechnungsversand',
    'Rechnung {{rechnungsnummer}}',
    '<p>Guten Tag {{kundenname}},</p><p>Rechnung über {{betrag}} €, fällig {{datum}}.</p>'
  ),
  (
    'zahlungserinnerung',
    'Zahlungserinnerung',
    'Mahnstufe freundlich',
    'Erinnerung: Rechnung {{rechnungsnummer}}',
    '<p>Hallo {{kundenname}},</p><p>bitte begleichen Sie den Betrag von {{betrag}} €.</p>'
  )
on conflict (slug) do nothing;


-- Kommunikation: Mail-Vorlagen und Antwort-Tracking im E-Mail-Protokoll
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

-- Projektvertrag und Compliance je Partner am Auftrag
alter table public.auftrag_handwerker
  add column if not exists compliance_pflicht_slugs text[] default null,
  add column if not exists projektvertrag_quelle text;
