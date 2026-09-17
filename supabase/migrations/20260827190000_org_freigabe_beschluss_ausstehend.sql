-- Phase 5: HV-Beschluss-Parkzustand vor Angebots-Freigabe
alter table public.leads
  add column if not exists beschluss_versammlung_am date,
  add column if not exists beschluss_protokoll_url text;

alter table public.leads
  drop constraint if exists leads_org_freigabe_status_check;

alter table public.leads
  add constraint leads_org_freigabe_status_check
  check (
    org_freigabe_status in (
      'nicht_noetig',
      'ausstehend',
      'beschluss_ausstehend',
      'freigegeben',
      'abgelehnt'
    )
  );

comment on column public.leads.beschluss_versammlung_am is 'Geplantes Datum der Eigentümerversammlung (HV-Freigabe Parkzustand)';
comment on column public.leads.beschluss_protokoll_url is 'Optional: URL zum Beschlussprotokoll';

alter table public.org_freigabe_log drop constraint if exists org_freigabe_log_aktion_check;
alter table public.org_freigabe_log add constraint org_freigabe_log_aktion_check check (
  aktion in (
    'angefordert',
    'freigegeben',
    'abgelehnt',
    'beschluss_ausstehend',
    'nachtrag_angefordert',
    'info_gesendet',
    'auto_auftrag'
  )
);
