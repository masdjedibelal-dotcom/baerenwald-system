-- Q4/Q5: Hard-Cut Annahme-Backfill + freigabe_bypass_grund

-- Q4: angebot_handwerker Legacy → akzeptiert
update public.angebot_handwerker
set status = 'akzeptiert'
where lower(trim(status)) in ('angenommen', 'uebernommen', 'übernommen');

-- Q4: angebote.status nachziehen, wenn mind. eine Zuweisung akzeptiert
update public.angebote a
set status = 'handwerker_akzeptiert',
    updated_at = now()
where exists (
  select 1
  from public.angebot_handwerker h
  where h.angebot_id = a.id
    and lower(trim(h.status)) = 'akzeptiert'
)
and lower(trim(coalesce(a.status::text, ''))) not in (
  'handwerker_akzeptiert',
  'kunde_akzeptiert',
  'beauftragt',
  'storniert',
  'abgelehnt'
);

-- Q5: Bypass-Grund am Lead (schwelle | akut | null)
alter table public.leads
  add column if not exists freigabe_bypass_grund text;

alter table public.leads
  drop constraint if exists leads_freigabe_bypass_grund_check;

alter table public.leads
  add constraint leads_freigabe_bypass_grund_check
  check (
    freigabe_bypass_grund is null
    or freigabe_bypass_grund in ('schwelle', 'akut')
  );

comment on column public.leads.freigabe_bypass_grund is
  'Wenn org_freigabe_status=nicht_noetig: schwelle | akut. Null = keine Bypass-Info.';

-- Q10: Objekt-Override (idempotent, falls 20260930 schon gelaufen)
alter table public.kunden_objekte
  add column if not exists freigabe_schwelle_eur numeric(12, 2);

alter table public.kunden_objekte
  add column if not exists notfall_direkt boolean;

comment on column public.kunden_objekte.freigabe_schwelle_eur is
  'Override Org-Schwelle; NULL = kunden.freigabe_schwelle_eur';
comment on column public.kunden_objekte.notfall_direkt is
  'Override Org-Notfall-Direkt; NULL = kunden.notfall_direkt';

-- A4 Snapshot am Angebot (idempotent)
alter table public.angebote
  add column if not exists org_freigabe_erforderlich boolean not null default false;

alter table public.angebote
  add column if not exists org_freigabe_berechnet_at timestamptz;

comment on column public.angebote.org_freigabe_berechnet_at is
  'Zeitpunkt der letzten Freigabe-Berechnung.';

-- B2/Q11: Mieter-STG „Handwerker vor Ort“
alter table public.leads
  add column if not exists mieter_vor_ort_at timestamptz;

comment on column public.leads.mieter_vor_ort_at is
  'Zeitpunkt der Vor-Ort-Bestätigung (Mieter-Statusschritt).';
