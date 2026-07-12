-- Projekt-Angebot: Dokumenttyp, Beschreibung, Fotos, Varianten, wichtige Hinweise
alter table public.angebote
  add column if not exists dokument_typ text default 'einfach';

update public.angebote set dokument_typ = coalesce(nullif(trim(dokument_typ), ''), 'einfach');

alter table public.angebote alter column dokument_typ set default 'einfach';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'angebote_dokument_typ_check'
  ) then
    alter table public.angebote add constraint angebote_dokument_typ_check
      check (dokument_typ in ('einfach', 'projekt'));
  end if;
end $$;

alter table public.angebote
  add column if not exists projektbeschreibung text;

alter table public.angebote
  add column if not exists fotos_urls jsonb default '[]'::jsonb;

alter table public.angebote
  add column if not exists varianten jsonb;

alter table public.angebote
  add column if not exists wichtige_hinweise text;

comment on column public.angebote.dokument_typ is 'einfach = Standardlayout; projekt = erweitertes Layout mit Beschreibung/Fotos/optional Varianten';
comment on column public.angebote.fotos_urls is 'Öffentliche Bild-URLs (JSON-Array) für Projektdokumentation im PDF';
comment on column public.angebote.varianten is 'Optional: { a: { name, positionen? }, b: { name, positionen? } }';
