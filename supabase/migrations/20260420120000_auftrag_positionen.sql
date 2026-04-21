-- Editierbare Auftragspositionen (statt nur JSON im Angebot)

create table if not exists auftrag_positionen (
  id uuid primary key default uuid_generate_v4(),
  auftrag_id uuid not null references auftraege(id) on delete cascade,
  gewerk_slug text,
  gewerk_name text not null,
  oberkategorie text,
  unterkategorie text,
  leistung_name text not null,
  beschreibung text,
  einheit text default 'pauschal',
  menge numeric(10,2) default 1,
  preis_fix numeric(10,2),
  lohn_fix numeric(10,2),
  material_fix numeric(10,2),
  handwerker_id uuid references handwerker(id) on delete set null,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table auftrag_positionen enable row level security;

create policy "auth_all" on auftrag_positionen for all
  using (auth.role() = 'authenticated');

create index if not exists auftrag_pos_idx on auftrag_positionen(auftrag_id);
