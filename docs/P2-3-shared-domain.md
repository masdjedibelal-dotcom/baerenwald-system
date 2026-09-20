# P2-3: Weg für geteilte Domänen-Logik

**Entscheidung (Belal, freigegeben — Mega-Auftrag E4):**

## E4 Hybrid — CRM ist Quelle, Portal wird synchronisiert, Paket später

| Schritt | Was |
|---------|-----|
| Jetzt | CRM = Source of Truth für Resolver, Status-Vokabular, Labels, Geld-/Datumsformat |
| Sync | `scripts/sync-shared-domain.mjs` kopiert CRM → Portal |
| Test | Paritäts-Test: **Byte-Gleichheit** der synchronisierten Dateien |
| Guard | Portal-Build: synchronisierte Dateien nicht manuell ändern |
| Später | Eigenes Ticket: npm-Workspace / `@baerenwald/domain` |

**Nicht ändern ohne Belal:** Resolver-Logik-Abweichungen → `docs/OFFENE-FRAGEN.md` + Tabelle in `docs/P2-1-resolver-abgleich.md`.

Portal-spezifisch bleibt getrennt: `portal2/status-mapping.ts`.

## Aktive Sync-Liste (`scripts/shared-domain-files.json`)

| CRM | Portal |
|-----|--------|
| `src/lib/status/status-map.ts` | `src/lib/shared-domain/status-map.ts` |
| `src/lib/status/status-vokabular.ts` | `src/lib/shared-domain/status-vokabular.ts` |
| `src/lib/format/geld-datum.ts` | `src/lib/shared-domain/geld-datum.ts` |

Geplant (noch Fork): `resolve-vorgang`, `vorgang-labels` — siehe P2-1 / P2-8.
