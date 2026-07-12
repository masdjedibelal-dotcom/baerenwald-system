-- Auftraggeber-Modus (Hausverwaltung, Gewerbe, Facility …)

alter table public.kunden
  add column if not exists portal_modus text not null default 'privat',
  add column if not exists org_kennung text,
  add column if not exists org_anzeigename text,
  add column if not exists org_logo_url text,
  add column if not exists freigabe_modus text not null default 'direkt',
  add column if not exists freigabe_schwelle_eur numeric,
  add column if not exists notfall_direkt boolean not null default true;

alter table public.kunden
  drop constraint if exists kunden_portal_modus_check;

alter table public.kunden
  add constraint kunden_portal_modus_check
  check (portal_modus in ('privat', 'organisation'));

alter table public.kunden
  drop constraint if exists kunden_freigabe_modus_check;

alter table public.kunden
  add constraint kunden_freigabe_modus_check
  check (freigabe_modus in ('direkt', 'freigabe'));

create unique index if not exists kunden_org_kennung_unique_idx
  on public.kunden (lower(trim(org_kennung)))
  where org_kennung is not null and trim(org_kennung) <> '';

comment on column public.kunden.portal_modus is 'privat = MeinBärenwald Standard; organisation = Auftraggeber-Portal';
comment on column public.kunden.org_kennung is 'URL-Slug z. B. musterverwaltung → /melden/{org_kennung}';
comment on column public.kunden.freigabe_modus is 'direkt = ohne Org-Freigabe; freigabe = Org muss freigeben';
comment on column public.kunden.freigabe_schwelle_eur is 'Ab diesem Betrag Freigabe nötig (null = immer nach freigabe_modus)';
comment on column public.kunden.notfall_direkt is 'Notfall-Meldungen umgehen Freigabe';

alter table public.kunden_objekte
  add column if not exists melde_slug text,
  add column if not exists melde_aktiv boolean not null default true,
  add column if not exists einheiten_hinweis text,
  add column if not exists notizen_intern text,
  add column if not exists created_by text not null default 'crm';

alter table public.kunden_objekte
  drop constraint if exists kunden_objekte_created_by_check;

alter table public.kunden_objekte
  add constraint kunden_objekte_created_by_check
  check (created_by in ('crm', 'portal'));

create unique index if not exists kunden_objekte_melde_slug_per_kunde_idx
  on public.kunden_objekte (kunde_id, lower(trim(melde_slug)))
  where melde_slug is not null and trim(melde_slug) <> '';

comment on column public.kunden_objekte.melde_slug is 'Teil-URL /melden/{org}/{melde_slug}';
comment on column public.kunden_objekte.melde_aktiv is 'Öffentliches Meldeformular ein/aus';

alter table public.leads
  add column if not exists auftraggeber_kunde_id uuid references public.kunden (id) on delete set null,
  add column if not exists anlass text,
  add column if not exists erfassung_von text,
  add column if not exists melder_name text,
  add column if not exists melder_einheit text,
  add column if not exists melder_telefon text,
  add column if not exists melder_email text,
  add column if not exists einladung_token uuid,
  add column if not exists einladung_status text,
  add column if not exists org_freigabe_status text not null default 'nicht_noetig',
  add column if not exists service_modus text;

alter table public.leads
  drop constraint if exists leads_anlass_check;

alter table public.leads
  add constraint leads_anlass_check
  check (
    anlass is null
    or anlass in ('meldung', 'projekt', 'servicepaket', 'sonstiges')
  );

alter table public.leads
  drop constraint if exists leads_erfassung_von_check;

alter table public.leads
  add constraint leads_erfassung_von_check
  check (
    erfassung_von is null
    or erfassung_von in ('melder', 'organisation', 'crm')
  );

alter table public.leads
  drop constraint if exists leads_einladung_status_check;

alter table public.leads
  add constraint leads_einladung_status_check
  check (
    einladung_status is null
    or einladung_status in ('offen', 'ergaenzt', 'entfallen')
  );

alter table public.leads
  drop constraint if exists leads_org_freigabe_status_check;

alter table public.leads
  add constraint leads_org_freigabe_status_check
  check (
    org_freigabe_status in (
      'nicht_noetig',
      'ausstehend',
      'freigegeben',
      'abgelehnt'
    )
  );

alter table public.leads
  drop constraint if exists leads_service_modus_check;

alter table public.leads
  add constraint leads_service_modus_check
  check (
    service_modus is null
    or service_modus in ('paket', 'einzeln')
  );

create unique index if not exists leads_einladung_token_unique_idx
  on public.leads (einladung_token)
  where einladung_token is not null;

create index if not exists leads_auftraggeber_kunde_id_idx
  on public.leads (auftraggeber_kunde_id)
  where auftraggeber_kunde_id is not null;

create index if not exists leads_anlass_idx
  on public.leads (anlass)
  where anlass is not null;

comment on column public.leads.auftraggeber_kunde_id is 'Organisation (HV) bei Melder-Meldungen; kunde_id = Melder';
comment on column public.leads.anlass is 'meldung | projekt | servicepaket';
comment on column public.leads.einladung_token is 'Token für /melden/ergaenzen/{token}';
comment on column public.leads.org_freigabe_status is 'Freigabe-Workflow Organisation';
