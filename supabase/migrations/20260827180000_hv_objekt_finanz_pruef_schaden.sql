-- HV Objekt: Prüfpflichten-Erweiterung, Schaden-Nr., Versicherungsakte-Zeitstempel

create table if not exists public.objekt_pruefpflichten (
  id uuid primary key default gen_random_uuid(),
  kunde_objekt_id uuid not null references public.kunden_objekte(id) on delete cascade,
  typ text not null,
  intervall_monate int,
  letzte_pruefung date,
  naechste_faellig date,
  nachweis_dokument_id uuid,
  quelle text not null default 'manuell',
  status text not null default 'aktiv',
  created_at timestamptz not null default now()
);

create index if not exists objekt_pruefpflichten_objekt_idx
  on public.objekt_pruefpflichten (kunde_objekt_id, naechste_faellig);

alter table public.objekt_pruefpflichten drop constraint if exists objekt_pruefpflichten_quelle_check;
alter table public.objekt_pruefpflichten add constraint objekt_pruefpflichten_quelle_check check (
  quelle in ('abo', 'manuell', 'crm')
);

alter table public.objekt_pruefpflichten
  add column if not exists typ_schluessel text,
  add column if not exists gewerk_id uuid references public.gewerke(id) on delete set null,
  add column if not exists geaendert_am timestamptz,
  add column if not exists geaendert_von_name text,
  add column if not exists geaendert_von_quelle text,
  add column if not exists notiz text;

alter table public.leads
  add column if not exists schaden_nr text,
  add column if not exists schaden_nr_geaendert_am timestamptz,
  add column if not exists versicherungs_nr_geaendert_am timestamptz,
  add column if not exists versicherungsakte_erstellt_am timestamptz;
