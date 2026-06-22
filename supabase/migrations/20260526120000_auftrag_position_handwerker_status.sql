-- Status pro Leistungsposition (Handwerker-Zuweisung auf Auftragsebene)

alter table public.auftrag_positionen
  add column if not exists handwerker_status text,
  add column if not exists handwerker_angefragt_at timestamptz;

comment on column public.auftrag_positionen.handwerker_status is
  'ausstehend | angefragt | warten | akzeptiert | abgelehnt | zugewiesen';
