-- Handwerker-Zuweisung: Preis, Absprachen, Notizen (intern)

alter table public.auftrag_handwerker
  add column if not exists vereinbarter_preis numeric(10,2),
  add column if not exists absprachen text,
  add column if not exists notizen text;

alter table public.auftrag_positionen
  add column if not exists absprachen text,
  add column if not exists notizen_intern text;

comment on column public.auftrag_handwerker.vereinbarter_preis is 'Vereinbarter Preis mit Handwerker (intern)';
comment on column public.auftrag_handwerker.absprachen is 'Absprachen mit Handwerker';
comment on column public.auftrag_handwerker.notizen is 'Interne Notizen zur Handwerker-Zuweisung';
