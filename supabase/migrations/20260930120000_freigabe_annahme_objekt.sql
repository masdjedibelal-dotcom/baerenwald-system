-- A1/A4/A5: HW-Annahme-Vokabular, Freigabe-Persistenz, Objekt-Override

-- A1: Legacy-Status auf kanonisch „akzeptiert“ (Zuweisungsebene)
update public.angebot_handwerker
set status = 'akzeptiert'
where lower(trim(status)) in ('angenommen', 'uebernommen', 'übernommen');

comment on column public.angebot_handwerker.status is
  'Kanonisch: ausstehend | angefragt | akzeptiert | abgelehnt | ersetzt | zugewiesen. Legacy angenommen/uebernommen → akzeptiert.';

-- A4: Freigabe-Erforderlich am Angebot persistieren (Portal liest nur)
alter table public.angebote
  add column if not exists org_freigabe_erforderlich boolean not null default false;

alter table public.angebote
  add column if not exists org_freigabe_berechnet_at timestamptz;

comment on column public.angebote.org_freigabe_erforderlich is
  'Snapshot: Org-Freigabe nötig (einmal berechnet in CRM). Portal liest nur.';
comment on column public.angebote.org_freigabe_berechnet_at is
  'Zeitpunkt der letzten Freigabe-Berechnung.';

-- A5: Objekt überschreibt Org-Default (NULL = erben)
alter table public.kunden_objekte
  add column if not exists freigabe_schwelle_eur numeric(12, 2);

alter table public.kunden_objekte
  add column if not exists notfall_direkt boolean;

comment on column public.kunden_objekte.freigabe_schwelle_eur is
  'Override Org-Schwelle; NULL = kunden.freigabe_schwelle_eur';
comment on column public.kunden_objekte.notfall_direkt is
  'Override Org-Notfall-Direkt; NULL = kunden.notfall_direkt';

-- A4: Default notfall_direkt explizit (kein NULL-Drift); Soll Akut→Direkt → true
update public.kunden
set notfall_direkt = true
where portal_modus = 'organisation'
  and notfall_direkt is null;

-- A2: Info-Versand an HV ohne Freigabe-Request
alter table public.org_freigabe_log drop constraint if exists org_freigabe_log_aktion_check;
alter table public.org_freigabe_log add constraint org_freigabe_log_aktion_check check (
  aktion in (
    'angefordert',
    'freigegeben',
    'abgelehnt',
    'nachtrag_angefordert',
    'info_gesendet',
    'auto_auftrag'
  )
);
