# Cursor-Prompt R4 — Doppeltes Rendern auf dem Telefon abstellen

Kopiere alles ab der Trennlinie in Cursor. Eigener Branch, eigener Commit, nach R3.
Dieser Auftrag ist größer als R1–R3. Er hat deshalb eine Messphase **vor** der Änderung.

---

## Auftrag R4: `useIsMobile` erzeugt auf jedem Screen einen Hydrations-Konflikt

**Befund.** `src/hooks/useIsMobile.ts` liest den Viewport im `useState`-Initialisierer:

```ts
function readIsMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 767px)').matches
}
```

Auf dem Server gibt es kein `window`, also ist das Ergebnis dort **immer `false`** — der Server
rendert die Desktop-Variante. Im Browser läuft derselbe Initialisierer erneut und gibt auf dem
Telefon `true` zurück. Damit weicht der Client-Aufbau vom Server-HTML ab: React verwirft den
serverseitig gelieferten Teilbaum und baut ihn im Browser neu.

Das passiert auf **43** Dateien, die `useIsMobile` verwenden, davon **33** mit einer echten
Layout-Verzweigung (`isMobile ? … : …`) und **40** ohne jeden Schutz dagegen (nur 3 Dateien haben
überhaupt einen `mounted`-Wächter, `suppressHydrationWarning` steht an 2 Stellen).

Zwei Folgen, beide vom Nutzer berichtet:

1. **„Das System lädt bei jedem Wechsel länger."** Auf dem Telefon wird auf diesen Screens die
   Arbeit zweimal gemacht: Server-HTML aufbauen, verwerfen, im Browser neu aufbauen. Das ist genau
   der Eindruck von Langsamkeit, der durch Aufräumen woanders nicht besser wird.
2. **„Mobile Cards passen nicht, weil Struktur falsch."** Der erste sichtbare Aufbau ist die
   Desktop-Struktur. In `KundenObjekteCard.tsx:34` ist das ein Raster mit fünf Spalten, als
   **Inline-Style** gesetzt:
   `const OBJEKT_LIST_COLS = '28px minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 0.7fr) 44px'`
   Inline-Styles kann keine Media Query überschreiben. Bei 390px bleiben nach 28px + 44px + vier
   Lücken rund 246px für drei Spalten — etwa 100 / 84 / 59 Pixel. Genau dieser zerrissene Aufbau
   war auf dem Gerät zu sehen.

### Phase A — messen, bevor etwas geändert wird

1. Starte einen lokalen Produktionsbuild (`npm run build && npm start`) und rufe mit einem
   Playwright-Skript bei **390px** Breite folgende Screens auf, eingeloggt, mit echten IDs:
   Dashboard, Vorgänge-Liste, Kunden-Liste, Kunden-Detail (Reiter Objekte), Anfrage-Detail,
   Angebots-Detail, Angebots-Wizard (Positionen), Rechnungs-Detail, Auftrag-Detail,
   Objektakte-Detail, Partner-Liste, Partner-Detail, Formulare-Liste, Einstellungen.
2. Sammle je Screen aus der Konsole alle Meldungen, die `hydrat` (case-insensitive) enthalten, und
   protokolliere sie mit Screen, Komponentenname aus der Meldung und Anzahl.
3. Schreib das Ergebnis nach `docs/mobile-audit/R4-hydration-messung.md` als Tabelle:
   Screen · Anzahl Meldungen · betroffene Komponenten. **Diese Tabelle ist die Arbeitsliste für
   Phase B.** Komponenten, die nicht melden, werden in Phase B nicht angefasst.

### Phase B — die Verzweigung von JavaScript nach CSS verlagern

Regel für alles Folgende: **Layout entscheidet CSS, nicht JavaScript.** `useIsMobile` bleibt
erlaubt für echtes Verhalten (ob ein Bearbeiten-Sheet oder ein Seitenpanel öffnet, ob ein
Drag-Handle aktiv ist) — nicht dafür, welches Markup entsteht.

4. **Rasterbreiten aus Inline-Styles in CSS holen.** Überall, wo
   `style={{ gridTemplateColumns: … }}` steht (beginne mit `KundenObjekteCard.tsx:34/227`, dann
   `grep -rn "gridTemplateColumns" src/`), wird die Spaltendefinition zu einer CSS-Variablen auf
   einer Listen-Klasse, z. B.
   `.ap-list--objekte { --cols: 28px minmax(0,1.2fr) minmax(0,1fr) minmax(0,0.7fr) 44px; }` und
   `.ap-list__row { grid-template-columns: var(--cols); }`. Im Mobile-Block wird `--cols` auf eine
   einspaltige Definition gesetzt. Damit greift die Media Query, und der Server liefert bereits das
   richtige Raster.
5. **Listen, die zwei völlig verschiedene Markups rendern** (`isMobile ? <Karten/> : <Tabelle/>`):
   entscheide je Liste eine der beiden Wege und halte dich im ganzen Repo daran:
   - **Vorzug:** ein Markup, das per CSS beide Formen annimmt (Raster aus Punkt 4, Zellen werden
     im Mobile-Block zu Blöcken). Das ist die Lösung für alle Listen mit potenziell vielen Zeilen.
   - **Nur wenn das nachweislich nicht geht:** beide Varianten rendern und eine per
     `md:hidden` / `hidden md:block` ausblenden — dieselbe Technik, die
     `detail-mobile-action-bar md:hidden` schon nutzt. Zulässig ausschließlich bei begrenzter
     Zeilenzahl, weil sonst das DOM doppelt entsteht.
   Schreib je Liste in den Bericht, welchen Weg du gewählt hast und warum.
6. **`useIsMobile` ehrlich machen.** Der Hook gibt weiterhin `boolean` zurück, aber es kommt ein
   zweiter dazu: `useIsMobileMounted(): boolean | null` — `null`, solange nicht gemountet. Jede
   Verwendung, die nach Phase A gemeldet hat und die nach Punkt 4/5 noch JavaScript braucht, nutzt
   den neuen Hook und rendert bei `null` **dasselbe** wie der Server: nämlich das gemeinsame
   Markup aus Punkt 5, nicht die Desktop-Variante.
   Kein `suppressHydrationWarning` als Abkürzung. Das versteckt den Konflikt, statt ihn zu lösen,
   und das doppelte Rendern bleibt.
7. Die zwei bestehenden `suppressHydrationWarning` prüfen: wenn sie denselben Konflikt verdecken,
   entfernen und richtig lösen. Wenn sie eine echte Ausnahme sind (Zeitangabe, Zufallswert), einen
   Kommentar mit der Begründung dazuschreiben.

### Phase C — Nachmessen und absichern

8. Phase A exakt wiederholen. Ziel: **null** Hydrations-Meldungen auf allen 14 Screens. Ergebnis in
   dieselbe Datei als zweite Tabelle („nach R4").
9. Miss zusätzlich je Screen die Zeit bis zur Interaktionsbereitschaft vor und nach der Änderung
   (Playwright, gleiche Bedingungen, drei Durchläufe, Median). Trag die Werte in die Datei ein.
   Wenn sich nichts verbessert, sag das so — keine geschönte Zahl.
10. Neuer Guard `scripts/check-mobile-branching.mjs`: bricht ab, wenn in einer Datei unter
    `src/components/` ein `useIsMobile()` mit einer Verzweigung im **JSX-Rückgabewert** kombiniert
    wird (Heuristik: `isMobile ?` innerhalb eines `return (`-Blocks) und die Datei nicht auf einer
    Ausnahmeliste `scripts/mobile-branching-allowlist.txt` steht. Die Ausnahmeliste enthält nach
    R4 nur Dateien, für die Punkt 5 den zweiten Weg begründet hat — jede Zeile mit einem Kommentar,
    warum. In die bestehende Guard-Kette vor `npm run build` einhängen.
11. Dasselbe im Portal-Repo prüfen: `grep -rn "useIsMobile\|matchMedia" src/` in `baerenwald`.
    Wenn dort das gleiche Muster existiert, identisch behandeln; wenn nicht, im Bericht
    „nicht betroffen" schreiben.

### Abnahme

- `docs/mobile-audit/R4-hydration-messung.md` enthält beide Tabellen und die Zeitmessung.
- Null Hydrations-Meldungen auf den 14 geprüften Screens bei 390px.
- `grep -rn "gridTemplateColumns" src/` liefert keine Treffer mehr in Listen-Zeilen.
- Der neue Guard schlägt an, wenn man testweise eine JSX-Verzweigung auf `isMobile` einbaut.
- `npx tsc --noEmit` und `npm run build` grün in beiden Repos.
- Die Ausnahmeliste hat keine Zeile ohne Begründung.

### Was dieser Auftrag nicht ist

R4 macht die Oberfläche **nicht schöner**. Er stellt her, dass auf dem Telefon von Anfang an die
richtige Struktur ausgeliefert wird und nicht erst im zweiten Durchgang. Das ist die Voraussetzung
dafür, dass ein anschließender visueller Durchgang überhaupt etwas Verlässliches vorfindet.
