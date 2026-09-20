-- P3-1: Gezielte Listen-Indexes (IF NOT EXISTS).
-- Quelle: List-Queries in src/lib/vorgang/load-vorgaenge-liste.ts
--   und src/lib/anfragen/anfragen-liste-data.ts (order by updated_at / created_at).
-- Nicht vom Agenten auf Prod anwenden (Belal M5 nach Staging-Abnahme).

-- Vorgänge / Anfragen: Sortierung nach Aktualität
CREATE INDEX IF NOT EXISTS leads_updated_at_idx
  ON public.leads (updated_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS leads_created_at_idx
  ON public.leads (created_at DESC NULLS LAST);

-- Angebote / Aufträge / Kunden: typische Listen-Sortierung
CREATE INDEX IF NOT EXISTS angebote_created_at_idx
  ON public.angebote (created_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS auftraege_created_at_idx
  ON public.auftraege (created_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS kunden_created_at_idx
  ON public.kunden (created_at DESC NULLS LAST);
