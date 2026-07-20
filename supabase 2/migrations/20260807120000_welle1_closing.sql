-- Welle 1 Closing (CRM-Spiegel)
alter table public.leads drop constraint if exists leads_hv_meldung_status_check;
alter table public.leads add constraint leads_hv_meldung_status_check check (
  hv_meldung_status is null
  or hv_meldung_status in (
    'neu',
    'notmassnahme',
    'angebot_eingefordert',
    'kleinreparatur',
    'abgelehnt',
    'abgeschlossen'
  )
);

alter table public.org_freigabe_log drop constraint if exists org_freigabe_log_aktion_check;
alter table public.org_freigabe_log add constraint org_freigabe_log_aktion_check check (
  aktion in ('angefordert', 'freigegeben', 'abgelehnt', 'nachtrag_angefordert')
);

alter table public.leads
  add column if not exists duplikat_hinweis boolean not null default false;
