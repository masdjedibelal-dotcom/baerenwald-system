# Umbau-Stand

Einstieg für jede Umbau-Sitzung. Plan und Pakete: Claude Doc „Bärenwald Fachkonzept“, Tab **Umbauplan**
(https://claude.ai/code/artifact/484818f3-d8fb-44c2-a45d-592f38d84734). Abnahmen: `docs/UMBAU-ABNAHME.md`.

## Regeln

- Ein Paket = eine Sitzung = Branch `umbau/pNN-name` in den betroffenen Repos (CRM `baerenwald-system`, Portal `baerenwald`).
- Test auf Staging: Branch in `staging` mergen → Netlify baut `staging--…` → Belal nimmt ab → erst dann `main`.
- Commit, Push und Prod-Migration nur nach Freigabe von Belal. Prod-DB sonst nur lesend (`scripts/audit/db-readonly.mjs`).
- Migrationen liegen im CRM unter `supabase/migrations/`. Neue Spalte → auch in `src/types/supabase.ts` (CRM), dann `node scripts/sync-shared-domain.mjs` (kopiert ins Portal).
- Fremde, nicht committete Änderungen im CRM (Cursor-Docs, `RechnungDetailClient.tsx`, `src/lib/copy/toast.ts`) nicht anfassen und nicht mit committen.

## Prüfwerkzeuge

- `TARGET=prod node scripts/audit/schema-snapshot.mjs` → danach `TARGET=prod python3 scripts/audit/code-vs-schema.py`: Abfragen im Code gegen das echte Schema.
- Portal: `node scripts/check-db-spalten.mjs` (Grundlinie `scripts/db-spalten-baseline.txt`, Maximum im Skript). CRM: `node scripts/check-db-spalten.mjs` (noch nicht im Build, kommt mit P03).
- `npx tsc --noEmit` in beiden Repos.

## Stand

| Paket | Status | Branch | Notiz |
|---|---|---|---|
| P01 Kundenportal vollständig | in Abnahme | `umbau/p01-kundenportal` (CRM + Portal) | Prod-Migration `20261212120000_auftrag_positionen_kunde_akzeptiert_at.sql` wartet auf Freigabe |
| P02 Partner-Portal vollständig | offen | | Rest-Grundlinie Portal: 7 Einträge, alle Partner |

## Nächstes Paket: P02

Offene Portal-Einträge (Grundlinie): `partner-abnahmeprotokoll.ts` (`auftrag_positionen.updated_at`, `auftrag_abnahmeprotokolle.handwerker_bestaetigt_at`),
`partner-auto-dokumente.ts` (`angebot_handwerker.updated_at`), `partner-hw-kalkulation.ts` (`angebote.gesamt_preis`),
`ensure-partner-angebot-handwerker-for-auftrag.ts` und `sync-angebot-handwerker.ts` (`auftrag_positionen.gewerk_id`),
`load-partner-compliance-data.ts` (`handwerker_vertraege.auftrag_titel`). Danach Grundlinie 0 und Maximum 0.

## Bekannte Stolperstellen

- Staging hinkte Prod um 3 Migrationen hinterher; am 29.09. nachgezogen (`lead_dokumente`, `stundensatz_kunde`, `auftrag_partner_aufgaben`). Vor jeder Abnahme Schema-Snapshot beider Ziele vergleichen.
- Portal-Build hat die Prüfung „keine Hex-Farben im Code“: Farben für Bibliotheken (QR, PDF) über `PALETTE` in `src/lib/tokens/palette.ts`, nie `var(--…)`.
