-- Erweiterte Abnahmeprotokoll-Felder (Übergabe, Personen, Fotos, Ergebnis) als JSON

alter table public.auftrag_abnahmeprotokolle
  add column if not exists meta jsonb not null default '{}'::jsonb;

comment on column public.auftrag_abnahmeprotokolle.meta is
  'Übergabe-Uhrzeit/Ort, Personen, Bauvorhaben-Kurzfelder, Ergebnis, Fotos, Rechtshinweise';
