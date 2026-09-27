# FIX 3 · Portal — Guards, die im Deploy nichts prüfen

Repo: **baerenwald**. Eigener Branch, ein Commit.

> **Keine Prüfung im Browser.** Nachweis nur über die Guard-Ausgaben, `npx tsc --noEmit`.
> Am Ende anhalten.

## Befund

Vier Guards hängen im Build und melden Erfolg, ohne zu prüfen:

| Guard | Verhalten |
|---|---|
| `check-shared-domain-sync` | kein CRM-Manifest erreichbar → **übersprungen, exit 0** |
| `check-db-spalten` | keine Typdatei und kein CRM-Nachbarordner (CI/Netlify) → **übersprungen, exit 0** |
| `check-drift-warn` | prüft, meldet, aber immer **exit 0** |
| `check-empty-catch-warn` | prüft, meldet, aber immer **exit 0** |

Auf Netlify gibt es den CRM-Nachbarordner nicht. Dort laufen also die ersten beiden ins Leere,
und die anderen beiden warnen nur. Der grüne Build im Deploy ist zu einem guten Teil gar keine
Prüfung — dieselbe Klasse wie ein Schreibvorgang, der scheitert und Erfolg meldet, nur eine
Ebene höher.

## Aufgabe

1. **`check-db-spalten`:** die Stufen „CRM-Nachbarordner" und „stillschweigend überspringen"
   beide entfernen. Der Guard liest ausschließlich `src/types/supabase.ts` im eigenen Repo.
   Fehlt die Datei, bricht er ab mit: „Typdatei fehlt — im CRM `npm run sync:shared-domain`
   ausführen." Kein stiller Erfolg, auch nicht in CI.

2. **Damit die Typdatei da ist:** `src/types/supabase.ts` in das Sync-Manifest des CRM
   aufnehmen (`scripts/shared-domain-files.json`), Zielpfad im Portal identisch. Prüfen, ob die
   Import-Umschreibungen des Sync-Skripts auf eine generierte Typdatei zutreffen — falls ja, sie
   davon ausnehmen. Kopfzeile wie bei den übrigen: `// SYNCED FROM CRM — do not edit`.

3. **`check-shared-domain-sync`:** dasselbe. Fehlt das Manifest, bricht der Guard ab statt zu
   überspringen. Ein Sync-Guard, der ohne Gegenstück grün meldet, bewacht nichts.

4. **`check-drift-warn` und `check-empty-catch-warn`:** entscheide je Guard und begründe im
   Bericht — entweder sie brechen ab (mit eingefrorener Grundlinie für den Bestand, Format
   eine Zeile je Fund, darf schrumpfen aber nicht wachsen), oder sie fliegen aus der Build-Kette
   und laufen als eigener Befehl. **Beides ist vertretbar. Im Build stehen und nie abbrechen ist
   es nicht** — das erzeugt Vertrauen, das nicht gedeckt ist.

5. **Restliche Guards durchsehen:** `grep -rn "übersprungen\|skip\|exit 0\|sibling\|baerenwald-system" scripts/`
   Jeder Guard, der sich selbst abschalten kann oder nie abbricht, kommt mit Befund in den
   Bericht. Beheben nur dort, wo es dieselbe stille Erfolgsmeldung ist — den Rest listen.

6. Nach Punkt 1 wird `check-db-spalten` im Portal rot (25 Verstöße). Das ist erwartet. Lege
   dafür die Grundlinie `scripts/db-spalten-baseline.txt` an: eine Zeile je Verstoß im Format
   `<datei>:<tabelle>:<spalte>`. Verhalten: in der Grundlinie → Warnung, nicht enthalten →
   Abbruch, verschwunden → Hinweis „behoben, Zeile entfernen". Schlusszeile bei jedem Lauf:
   `Grundlinie: N offen`. Sie darf schrumpfen, nicht wachsen.
   **Die 25 Verstöße nicht reparieren** — nur eintragen.

## Abnahme

- Testweise `src/types/supabase.ts` umbenennen → `check-db-spalten` **bricht ab**, keine
  Erfolgsmeldung
- Testweise die Umgebungsvariable für den CRM-Ordner leeren → `check-shared-domain-sync`
  **bricht ab**
- Kein Guard im Portal kann sich mehr selbst überspringen (Liste aus Punkt 5 im Bericht)
- `npm run build` grün — mit Grundlinie, nicht durch Wegsehen
- `npx tsc --noEmit` grün

## Bericht

Die Entscheidung je Guard aus Punkt 4 mit Begründung, die Liste aus Punkt 5, und der Startwert
der Grundlinie.

Commit: `fix(portal): Guards brechen ab statt stillschweigend zu überspringen`
