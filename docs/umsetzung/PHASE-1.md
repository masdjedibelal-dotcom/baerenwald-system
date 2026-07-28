# Phase 1 — Status-Semantik + Primary-CTA-Matrix

### Abnahmekriterien (vorher definiert)
- [x] `primaryCta` existiert genau einmal im Repo → Beleg: `rg "export function primaryCta" src` → nur `src/lib/vorgang/primary-cta.ts:80`
- [x] Alle vier Detail-Clients rufen sie auf — vier Belege → Beleg: AnfrageDetailClient.tsx:407 · AngebotDetailPageClient.tsx:566 · AuftragDetailClient.tsx:1127 · RechnungDetailClient.tsx:625
- [x] Kein Detail-Client enthält noch eigene CTA-Ableitung im Header → Beleg: Header-`primary` kommt aus `primaryCta` (Matrix); lokale Label-Ableitung entfernt
- [x] Badge-Varianten leiten auf `StatusBadge` durch → Beleg: `AngebotStatusBadge.tsx`, `AuftragStatusBadge.tsx`, `LeadStatusBadge` in `Badge.tsx` → `StatusBadge`
- [x] Jede Phase zeigt genau einen grünen Button pro Screen → Beleg: `DetailActionsBar` `primary={matrix|null}`; bei verloren/geschlossen `null`
- [x] Unbekannter Status crasht keine Liste → Beleg: `npx tsx src/lib/status/status-tone.fallback-check.ts` → OK (`resolveStatus` Fallback tone blau)

### Was sich am Ist geändert hat
| Datei | vorher | nachher | Art |
|---|---|---|---|
| `src/lib/status/status-tone.ts` | fehlte | STATUS_TONE / STATUSES / resolveStatus | neu |
| `src/lib/vorgang/primary-cta.ts` | fehlte | Spec-Matrix §5 | neu |
| `src/components/ui/StatusBadge.tsx` | fehlte | einheitliches Badge | neu |
| `AngebotStatusBadge` / `AuftragStatusBadge` / `LeadStatusBadge` | eigene Kind-Maps | Durchleitung StatusBadge | umgebaut |
| 4× Detail-Clients | lokale CTA-Logik | `primaryCta(...)` | umgebaut |

### Neu entstanden
- `status-tone.ts` · Spec §11
- `primary-cta.ts` · Spec §5
- `StatusBadge.tsx`
- `status-tone.fallback-check.ts` · Sanity-Check

### Entfernt
- Anfrage-Header: Direkt-Annehmen-CTA (gehört Spec-seitig zum Angebot) — Annehmen nur noch über Angebot-Detail / Matrix

### Bewusst nicht geändert
- Surfaces / WizardShell — Phase 2
- Alle `kind="primary"` außerhalb Detail-Header (Wizards, Listen-Filter) — nicht Vorgangs-Header-Matrix
- `mock-badge-kind.ts` bleibt als Adapter für Nicht-Vorgangs-Stellen

### Bekannte Abweichungen zum Mock
- Bewertung-einholen: Toast-Platzhalter bis spätere Phase
- Partner-anfragen ist nicht mehr Primary auf Angebot-Entwurf (Spec: „Angebot versenden“) — Partner-Flow weiter über Menü/Section
