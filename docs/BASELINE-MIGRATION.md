# Baseline-Migration — Anleitung (nicht anwenden)

**Zweck:** Staging und Prod auf denselben Migrationsstand bringen.  
**Agent/CI:** Diese Datei ist nur Doku. Kein automatisches Apply auf Prod.

## Projekt-Refs

| Umgebung | Ref |
|----------|-----|
| Staging | `soqownnkxmtfgvsbrgsl` |
| Prod | `wnotlydvhsmfkhexgeol` |

## Ablauf (Belal)

1. **Diff prüfen** (lokal, CLI oder Dashboard):
   - Welche Migrationen in `supabase/migrations/` fehlen auf Staging?
   - Welche fehlen auf Prod?
2. **Zuerst Staging:**
   ```bash
   # Beispiel — nur wenn CLI + Linked Staging konfiguriert:
   npx supabase db push --project-ref soqownnkxmtfgvsbrgsl
   # oder Migrationen einzeln im Dashboard SQL Editor (Staging)
   ```
3. **Smoke auf Staging** (Login, Vorgänge, Anfrage, Angebot, Auftrag).
4. **Dann Prod** nur nach Freigabe (Blocker M5 in `docs/AUDIT-BLOCKER.md`):
   - Gleiche Migrationen in gleicher Reihenfolge.
   - Keine Schema-Experimente „nur Prod“.
5. **Types regenerieren** nach Schema-Änderung:
   - Staging: `npx supabase gen types typescript --project-id soqownnkxmtfgvsbrgsl`
   - Output → `src/types/supabase.ts` (siehe P7-4).

## P3-1 Listen-Indexes

Datei: `supabase/migrations/20260919140000_common_list_indexes.sql`  
`CREATE INDEX IF NOT EXISTS` — sicher additiv. Zuerst Staging, Prod erst nach M5.

## Was hier nicht steht

- Keine Prod-Credentials.
- Kein „force“ / Reset.
- Keine Daten-Seeds als Baseline (separate Seeds nur Staging).
