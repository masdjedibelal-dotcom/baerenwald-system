-- Logo-Storage, E-Mail-Templates, Gewerke sort_order, Compliance aktiv

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']::text[]
)
on conflict (id) do nothing;

drop policy if exists "logos_public_read" on storage.objects;
create policy "logos_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'logos');

drop policy if exists "logos_authenticated_insert" on storage.objects;
create policy "logos_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'logos');

drop policy if exists "logos_authenticated_update" on storage.objects;
create policy "logos_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'logos');

drop policy if exists "logos_authenticated_delete" on storage.objects;
create policy "logos_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'logos');

-- ---------------------------------------------------------------------------
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

alter table public.gewerke add column if not exists sort_order int not null default 0;

alter table public.compliance_dokument_typen
  add column if not exists aktiv boolean not null default true;
