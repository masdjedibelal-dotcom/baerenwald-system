-- Soft-Delete für Partner-Compliance: Datei bleibt sichtbar bis CRM endgültig löscht.
alter table public.partner_dokumente
  add column if not exists geloescht_am timestamptz,
  add column if not exists geloescht_von text;

comment on column public.partner_dokumente.geloescht_am is
  'Partner hat Unterlage soft-gelöscht; CRM bestätigt endgültig.';
comment on column public.partner_dokumente.geloescht_von is
  'partner | crm';

alter table public.partner_dokumente
  drop constraint if exists partner_dokumente_status_check;

alter table public.partner_dokumente
  add constraint partner_dokumente_status_check
  check (
    status in (
      'freigegeben',
      'genehmigt',
      'hochgeladen',
      'in_pruefung',
      'eingereicht',
      'abgelehnt',
      'geloescht'
    )
  );

comment on column public.partner_dokumente.status is
  'freigegeben | genehmigt | hochgeladen | in_pruefung | eingereicht | abgelehnt | geloescht';
