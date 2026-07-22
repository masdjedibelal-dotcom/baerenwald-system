-- Positions-Lebenszyklus + position_eintraege (ersetzt freies BT als Eingabe)
-- Spec: Bautagebuch-Logik neu. Alt: auftrag_bautagebuch_eintraege bleibt read-only (Altdaten).
-- status-Lebenszyklus = bestehendes leistung_status (offen|in_arbeit|erledigt).

-- ---------------------------------------------------------------------------
-- 1) auftrag_positionen erweitern
-- ---------------------------------------------------------------------------
alter table public.auftrag_positionen
  add column if not exists typ text,
  add column if not exists verguetung text,
  add column if not exists geschaetzt_std numeric(10, 2),
  add column if not exists stundensatz numeric(10, 2),
  add column if not exists gestartet_am timestamptz,
  add column if not exists erledigt_am timestamptz,
  add column if not exists anerkennung_status text;

-- Defaults für Bestand
update public.auftrag_positionen
set typ = coalesce(typ, 'lv')
where typ is null;

update public.auftrag_positionen
set verguetung = coalesce(verguetung, 'festpreis')
where verguetung is null;

update public.auftrag_positionen
set anerkennung_status = coalesce(anerkennung_status, 'nicht_noetig')
where anerkennung_status is null;

alter table public.auftrag_positionen
  alter column typ set default 'lv',
  alter column verguetung set default 'festpreis',
  alter column anerkennung_status set default 'nicht_noetig';

alter table public.auftrag_positionen drop constraint if exists auftrag_positionen_typ_check;
alter table public.auftrag_positionen
  add constraint auftrag_positionen_typ_check
  check (typ is null or typ in ('lv', 'regie', 'material'));

alter table public.auftrag_positionen drop constraint if exists auftrag_positionen_verguetung_check;
alter table public.auftrag_positionen
  add constraint auftrag_positionen_verguetung_check
  check (verguetung is null or verguetung in ('festpreis', 'aufwand'));

alter table public.auftrag_positionen drop constraint if exists auftrag_positionen_anerkennung_check;
alter table public.auftrag_positionen
  add constraint auftrag_positionen_anerkennung_check
  check (
    anerkennung_status is null
    or anerkennung_status in ('nicht_noetig', 'in_pruefung', 'anerkannt', 'abgelehnt')
  );

-- leistung_status bleibt Spec-status (offen|in_arbeit|erledigt)
alter table public.auftrag_positionen drop constraint if exists auftrag_positionen_leistung_status_check;
alter table public.auftrag_positionen
  add constraint auftrag_positionen_leistung_status_check
  check (
    leistung_status is null
    or leistung_status in ('offen', 'in_arbeit', 'erledigt')
  );

comment on column public.auftrag_positionen.typ is 'lv | regie | material';
comment on column public.auftrag_positionen.verguetung is 'festpreis | aufwand';
comment on column public.auftrag_positionen.leistung_status is
  'Lebenszyklus laut Spec status: offen | in_arbeit | erledigt';
comment on column public.auftrag_positionen.anerkennung_status is
  'Weitere Arbeit / Regie: nicht_noetig | in_pruefung | anerkannt | abgelehnt';

-- ---------------------------------------------------------------------------
-- 2) position_eintraege
-- ---------------------------------------------------------------------------
create table if not exists public.position_eintraege (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.auftrag_positionen (id) on delete cascade,
  typ text not null,
  beschreibung text,
  beschreibung_roh text,
  zeit_minuten int,
  erfasst_von text not null default 'partner_app',
  erfasser_akteur text,
  quelle text,
  rueckdatiert_grund text,
  ereignis_zeit timestamptz,
  created_at timestamptz not null default now(),
  constraint position_eintraege_typ_check check (
    typ in ('start', 'fortschritt', 'ergebnis', 'weitere_arbeit')
  ),
  constraint position_eintraege_erfasst_von_check check (
    erfasst_von in ('partner_app', 'eigenbetrieb_app', 'crm_intern')
  ),
  constraint position_eintraege_quelle_check check (
    quelle is null
    or quelle in ('telefonisch', 'foto_erhalten', 'vor_ort')
  )
);

create index if not exists position_eintraege_position_idx
  on public.position_eintraege (position_id, created_at);

comment on table public.position_eintraege is
  'Positions-Lebenszyklus-Einträge (Start/Fortschritt/Ergebnis) — ersetzt freies BT als Eingabe';

alter table public.position_eintraege enable row level security;

drop policy if exists "position_eintraege_crm_staff_all" on public.position_eintraege;
create policy "position_eintraege_crm_staff_all"
  on public.position_eintraege for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "position_eintraege_portal_select" on public.position_eintraege;
create policy "position_eintraege_portal_select"
  on public.position_eintraege for select to authenticated
  using (
    public.is_portal_handwerker()
    and position_id in (
      select ap.id
      from public.auftrag_positionen ap
      where ap.handwerker_id = public.portal_handwerker_id()
    )
  );

drop policy if exists "position_eintraege_portal_insert" on public.position_eintraege;
create policy "position_eintraege_portal_insert"
  on public.position_eintraege for insert to authenticated
  with check (
    public.is_portal_handwerker()
    and erfasst_von in ('partner_app', 'eigenbetrieb_app')
    and position_id in (
      select ap.id
      from public.auftrag_positionen ap
      where ap.handwerker_id = public.portal_handwerker_id()
    )
  );

drop policy if exists "position_eintraege_portal_update" on public.position_eintraege;
create policy "position_eintraege_portal_update"
  on public.position_eintraege for update to authenticated
  using (
    public.is_portal_handwerker()
    and position_id in (
      select ap.id
      from public.auftrag_positionen ap
      where ap.handwerker_id = public.portal_handwerker_id()
    )
  )
  with check (
    public.is_portal_handwerker()
    and position_id in (
      select ap.id
      from public.auftrag_positionen ap
      where ap.handwerker_id = public.portal_handwerker_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 3) eintrag_fotos
-- ---------------------------------------------------------------------------
create table if not exists public.eintrag_fotos (
  id uuid primary key default gen_random_uuid(),
  eintrag_id uuid not null references public.position_eintraege (id) on delete cascade,
  storage_path text not null,
  exif_aufnahme timestamptz,
  server_eingang timestamptz not null default now(),
  exif_gps_lat numeric(10, 7),
  exif_gps_lng numeric(10, 7),
  aufnahmeart text not null default 'direkt',
  nachreich_grund text,
  created_at timestamptz not null default now(),
  constraint eintrag_fotos_aufnahmeart_check check (
    aufnahmeart in ('direkt', 'nachgereicht')
  ),
  constraint eintrag_fotos_nachreich_check check (
    aufnahmeart <> 'nachgereicht'
    or (nachreich_grund is not null and length(trim(nachreich_grund)) > 0)
  )
);

create index if not exists eintrag_fotos_eintrag_idx
  on public.eintrag_fotos (eintrag_id);

comment on column public.eintrag_fotos.exif_gps_lat is 'GPS Latitude (statt POINT — einfacher in JS)';
comment on column public.eintrag_fotos.exif_gps_lng is 'GPS Longitude';

alter table public.eintrag_fotos enable row level security;

drop policy if exists "eintrag_fotos_crm_staff_all" on public.eintrag_fotos;
create policy "eintrag_fotos_crm_staff_all"
  on public.eintrag_fotos for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "eintrag_fotos_portal_select" on public.eintrag_fotos;
create policy "eintrag_fotos_portal_select"
  on public.eintrag_fotos for select to authenticated
  using (
    public.is_portal_handwerker()
    and eintrag_id in (
      select pe.id
      from public.position_eintraege pe
      join public.auftrag_positionen ap on ap.id = pe.position_id
      where ap.handwerker_id = public.portal_handwerker_id()
    )
  );

drop policy if exists "eintrag_fotos_portal_insert" on public.eintrag_fotos;
create policy "eintrag_fotos_portal_insert"
  on public.eintrag_fotos for insert to authenticated
  with check (
    public.is_portal_handwerker()
    and eintrag_id in (
      select pe.id
      from public.position_eintraege pe
      join public.auftrag_positionen ap on ap.id = pe.position_id
      where ap.handwerker_id = public.portal_handwerker_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 4) position_material
-- ---------------------------------------------------------------------------
create table if not exists public.position_material (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.auftrag_positionen (id) on delete cascade,
  bezeichnung text not null,
  menge numeric(12, 3) not null default 1,
  einzelpreis numeric(12, 2) not null default 0,
  beleg_foto_id uuid references public.eintrag_fotos (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists position_material_position_idx
  on public.position_material (position_id);

alter table public.position_material enable row level security;

drop policy if exists "position_material_crm_staff_all" on public.position_material;
create policy "position_material_crm_staff_all"
  on public.position_material for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "position_material_portal_select" on public.position_material;
create policy "position_material_portal_select"
  on public.position_material for select to authenticated
  using (
    public.is_portal_handwerker()
    and position_id in (
      select ap.id
      from public.auftrag_positionen ap
      where ap.handwerker_id = public.portal_handwerker_id()
    )
  );

drop policy if exists "position_material_portal_insert" on public.position_material;
create policy "position_material_portal_insert"
  on public.position_material for insert to authenticated
  with check (
    public.is_portal_handwerker()
    and position_id in (
      select ap.id
      from public.auftrag_positionen ap
      where ap.handwerker_id = public.portal_handwerker_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 5) Tagesspannen-View (nur Direkt-Fotos)
-- ---------------------------------------------------------------------------
create or replace view public.v_auftrag_tagesspannen
with (security_invoker = true)
as
select
  ap.auftrag_id,
  (timezone('Europe/Berlin', coalesce(ef.exif_aufnahme, ef.server_eingang)))::date as tag,
  min(coalesce(ef.exif_aufnahme, ef.server_eingang)) as spanne_von,
  max(coalesce(ef.exif_aufnahme, ef.server_eingang)) as spanne_bis,
  count(ef.id)::int as foto_count
from public.eintrag_fotos ef
join public.position_eintraege pe on pe.id = ef.eintrag_id
join public.auftrag_positionen ap on ap.id = pe.position_id
where ef.aufnahmeart = 'direkt'
group by ap.auftrag_id, (timezone('Europe/Berlin', coalesce(ef.exif_aufnahme, ef.server_eingang)))::date;

comment on view public.v_auftrag_tagesspannen is
  'Dokumentierte Zeitspanne je Auftrag+Tag aus Direkt-Fotos (Plausibilisierung, kein Timer)';
