-- Melde-Flow: Löschfristen, VVT-Eintrag, Kontext für Betroffenenanfragen

insert into public.datenschutz_fristen (kategorie, bezeichnung, frist_monate, beschreibung, gesetzliche_grundlage)
values
  (
    'melder_leads_offen',
    'Melder-Leads ohne Auftrag (offen/abgebrochen)',
    12,
    'Schadenmeldungen über /melden ohne weiterführenden Auftrag',
    'DSGVO Art. 17 — berechtigtes Interesse endet nach Abschluss/Ablehnung'
  ),
  (
    'melder_leads_abgeschlossen',
    'Melder-Leads mit abgeschlossenem Vorgang ohne Auftrag',
    24,
    'Abgelehnte oder erledigte Meldungen ohne Auftragsanlage',
    'DSGVO Art. 17'
  ),
  (
    'melder_fotos',
    'Fotos in Melder-Meldungen',
    12,
    'funnel_daten.fotos bei Leads kanal hv_melder_link / hv_einladung',
    'DSGVO Art. 17 — Zweckbindung Schadensdokumentation'
  )
on conflict (kategorie) do nothing;

alter table public.datenschutz_anfragen
  add column if not exists kontext text;

comment on column public.datenschutz_anfragen.kontext is
  'Betroffenen-Kontext: mieter_meldung | privatkunde | partner | sonstiges';

create table if not exists public.datenschutz_vvt (
  id uuid primary key default gen_random_uuid(),
  titel text not null unique,
  zweck text not null,
  rechtsgrundlage text,
  betroffene_kategorien text,
  datenarten text,
  empfaenger text,
  drittland text,
  loeschfrist_hinweis text,
  toms text,
  aktiv boolean not null default true,
  sort_order int not null default 0
);

comment on table public.datenschutz_vvt is 'Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO)';

alter table public.datenschutz_vvt enable row level security;

drop policy if exists "datenschutz_vvt_auth_all" on public.datenschutz_vvt;
create policy "datenschutz_vvt_auth_all"
  on public.datenschutz_vvt for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

insert into public.datenschutz_vvt (
  titel,
  zweck,
  rechtsgrundlage,
  betroffene_kategorien,
  datenarten,
  empfaenger,
  drittland,
  loeschfrist_hinweis,
  toms,
  sort_order
)
values
  (
    'Mieter-Schadenmeldungen (Melde-Link)',
    'Entgegennahme und Bearbeitung von Schadenmeldungen über öffentlichen Link /melden/{org}',
    'Art. 6 Abs. 1 lit. b und/oder lit. f DSGVO — Verantwortlicher: Hausverwaltung (mit Anwalt finalisieren)',
    'Mieter, ggf. Ansprechpartner der Hausverwaltung',
    'Kontaktdaten, Wohnung/Einheit, Schadensbeschreibung, Fotos, Objektbezug',
    'Hausverwaltung (Auftraggeber), Bärenwald (Koordination/CRM), ggf. Handwerker nach Freigabe',
    'Resend/Netlify (EU-US Data Privacy Framework), Supabase EU — siehe AVV-Anlage',
    'melder_leads_offen: 12 Monate; melder_leads_abgeschlossen: 24 Monate; melder_fotos: 12 Monate',
    'RLS, Portal-Auth, Rate-Limit, Löschprotokoll, Verschlüsselung in Transit',
    10
  ),
  (
    'Auftraggeber-Portal (Hausverwaltung)',
    'Freigabe-Workflow, Objektverwaltung, Meldungen im Auftraggeber-Portal',
    'Art. 6 Abs. 1 lit. b DSGVO (Vertrag mit Hausverwaltung)',
    'Mitarbeiter/Ansprechpartner der Hausverwaltung, Mieter (indirekt)',
    'Login-Daten, Organisationsstammdaten, Meldungs- und Freigabedaten',
    'Bärenwald-intern, Hausverwaltung, E-Mail über Resend',
    'Supabase EU, Resend DPF',
    'Vertragslaufzeit + gesetzliche Aufbewahrung',
    'Supabase Auth, RLS, CRM-Zugriffskontrolle',
    20
  )
on conflict (titel) do nothing;
