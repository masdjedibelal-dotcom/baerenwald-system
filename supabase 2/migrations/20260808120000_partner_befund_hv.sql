-- Welle 2a: Partner-Schadenbefund (sichtbar für HV read-only, CRM, Versicherungsakte)

alter table public.auftrag_bautagebuch_eintraege
  add column if not exists eintrag_typ text not null default 'tagebuch';

alter table public.auftrag_bautagebuch_eintraege
  drop constraint if exists auftrag_bautagebuch_eintraege_typ_check;

alter table public.auftrag_bautagebuch_eintraege
  add constraint auftrag_bautagebuch_eintraege_typ_check
  check (eintrag_typ in ('tagebuch', 'befund'));

comment on column public.auftrag_bautagebuch_eintraege.eintrag_typ is
  'tagebuch = Baustellen-Tagebuch; befund = Schadenbefund/Leckortung (HV read-only)';

create index if not exists auftrag_bautagebuch_befund_idx
  on public.auftrag_bautagebuch_eintraege (auftrag_id)
  where eintrag_typ = 'befund';
