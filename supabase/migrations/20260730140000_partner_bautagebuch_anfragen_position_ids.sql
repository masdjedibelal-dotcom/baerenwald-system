-- Bautagebuch-Anforderung: optionale Leistungs-IDs für Portal-Deep-Link

alter table public.partner_bautagebuch_anfragen
  add column if not exists position_ids uuid[] not null default '{}';

comment on column public.partner_bautagebuch_anfragen.position_ids is
  'Optionale auftrag_positionen.id — im Portal vorauswählen beim Update.';
