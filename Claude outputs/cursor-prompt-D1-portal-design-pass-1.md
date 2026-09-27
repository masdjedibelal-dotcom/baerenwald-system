# Cursor-Prompt D1 — Portal: Design-Werte durchsetzen (Mittelweg)

Kopiere alles ab der Trennlinie in Cursor. Eigener Branch. **Erst nach R5.**
Drei Schritte, nach jedem Schritt anhalten und Ergebnis zeigen.

> **Grundregel für den ganzen Auftrag: keine Prüfung im Browser.** Keine Screenshots, kein
> Playwright, kein Messskript, kein Dev-Server, kein Login, kein E2E-Test. Wenn ein Schritt eine
> Anmeldung oder Testdaten zu brauchen scheint, ist der Schritt falsch verstanden — anhalten und
> nachfragen, statt eine Anmeldung zu bauen.
>
> Nachweis ausschließlich über `grep` auf dem Quelltext, `npx tsc --noEmit` und `npm run build`.
> **Ob es gut aussieht, entscheidet Belal am Gerät.**

---

## Auftrag D1: Das Portal hat ein Designsystem — es benutzt es nur nicht

**Befund, gemessen in `src/app/globals.css` (7.038 Zeilen).**

Die Radien sind vollständig als Tokens definiert (`globals.css:254-262`):
`--p2-radius-sm: 12px`, `md: 18px`, `lg: 22px`, `sheet: 28px`, dazu `card`, `button`, `field`, `pill`.
Benutzt werden sie fast nie. Stattdessen stehen im Stylesheet rohe Werte:
`999px` (24×), `22px` (15×), `18px` (9×), `15px` (9×), `8px` (8×), `12px` (7×), `99px` (7×), `10px` (6×),
`16px` (5×), `9px` (4×), `9999px` (4×), `50%` (8×) — **zwölf verschiedene Radien**, und „Pille" ist in
**drei** Schreibweisen vorhanden (`999px`, `99px`, `9999px`), die identisch aussehen.

Dazu widersprechen sich Token und Rückfallwert:

```css
border-radius: var(--p2-radius-md, 12px);   /* md ist 18px  → globals.css:692, 699 u.a. */
border-radius: var(--p2-radius-sm, 9px);    /* sm ist 12px */
```

Und `--portal-btn-radius: 14px` ist ein fünfter Radius, der in der Skala nicht vorkommt.

Weiter:

| Was | Befund |
|---|---|
| Schatten | **50 verschiedene** `box-shadow`-Definitionen bei 121 Verwendungen, davon 29 über ein Token |
| Abstände | **keine** Abstands-Tokens (`--p2-space-*`, `--p2-gap-*` existieren nicht); alle Werte handgetippt |
| Rohe Hex-Farben | **158** im Stylesheet |
| `:focus-visible` | **7** Regeln in 7.038 Zeilen; `outline: none` steht 7× |
| Ladezustand | `aria-busy` kommt **0×** vor — kein Knopf zeigt, dass er arbeitet |

Das ist die Diagnose in einem Satz: **nicht „kein Designsystem", sondern ein Designsystem, das niemand
benutzt.** Deshalb ist dieser Auftrag Durchsetzung, nicht Neuentwurf. Es wird **kein** neuer Look
erfunden, keine Typo-Skala angefasst, kein Screen umgebaut.

---

### Schritt 1 — Skalen durchsetzen. Danach anhalten.

1. **Radien: nur diese fünf.** `--p2-radius-sm (12)`, `md (18)`, `lg (22)`, `sheet (28)`,
   `pill (999px)`. Jeden rohen Wert im Stylesheet auf den **nächstliegenden** dieser fünf abbilden:
   8/9/10/12 → `sm`, 15/16/18 → `md`, 20/22 → `lg`, 28 → `sheet`, 99px/999px/9999px → `pill`.
   `50%` bleibt, wo ein echter Kreis gemeint ist (Avatar, Punkt) — nur dort.
2. Alle widersprüchlichen Rückfallwerte entfernen: `var(--p2-radius-md)` ohne zweites Argument,
   `var(--p2-radius-sm)` ohne zweites Argument. Ein Token hat genau einen Wert.
3. `--portal-btn-radius` auf `var(--p2-radius-sm)` setzen, nicht 14px. Danach hat das Portal fünf
   Radien, nicht zwölf.
4. **Abstände: sechs Stufen, neu anlegen** in `src/lib/portal2/tokens.ts` neben den Radien und als
   CSS-Variablen ausspielen wie diese:
   `--p2-space-1: 2px · -2: 4px · -3: 8px · -4: 12px · -5: 16px · -6: 24px`.
5. **Dichte: zwei Stufen aus derselben Skala** — kompakt am Schreibtisch, luftig am Telefon.
   Vier abgeleitete Variablen, im Mobile-Block (`max-width: 767px`) umgesetzt:
   | Variable | Desktop | Mobil |
   |---|---|---|
   | `--p2-row-pad` | `var(--p2-space-4)` 12 | `var(--p2-space-5)` 16 |
   | `--p2-row-gap` | `var(--p2-space-3)` 8 | `var(--p2-space-4)` 12 |
   | `--p2-card-pad` | `var(--p2-space-5)` 16 | `var(--p2-space-6)` 24 |
   | `--p2-stack` | `var(--p2-space-4)` 12 | `var(--p2-space-5)` 16 |
   Ersetze in den Zeilen-, Karten- und Kachel-Regeln die handgetippten Werte durch diese vier.
   **Nicht** das ganze Stylesheet umstellen — nur Zeilen, Karten, Kacheln, Listen und die in R5
   angefassten Klassen. Der Rest folgt später.
6. **Schatten: drei Stufen.** `--p2-shadow-flat` (Trennung ohne Erhebung, z. B. eine 0,5px-Linie
   statt Schatten), `--p2-shadow-card`, `--p2-shadow-float` (Sheets, schwebende Leisten, Menüs).
   Die 50 vorhandenen Definitionen auf diese drei abbilden. Wo eine Definition sich keiner der drei
   zuordnen lässt, im Bericht nennen und **nicht** eine vierte Stufe erfinden.
7. Die doppelte `.portal-list-stack`-Deklaration mit widersprüchlichem `gap` (9px gegen 11px) auf
   **eine** reduzieren, Wert aus der Skala.
8. **Anhalten und als Text belegen.** Kein Bild — stattdessen eine Zähltabelle vor/nach, erzeugt
   mit `grep` über `src/app/globals.css`:

   | Kennzahl | vorher | nachher (Ziel) |
   |---|---|---|
   | verschiedene `border-radius`-Rohwerte | 12 | **0** (nur `0` und `50%`) |
   | Schreibweisen für Pille | 3 | **1** |
   | verschiedene `box-shadow`-Definitionen | 50 | **3** |
   | `gap`/`padding`-Werte außerhalb der Sechser-Skala | — | **0** in den angefassten Regeln |

   Die Zahlen kommen aus `grep` über `src/app/globals.css`, nicht aus einem Browser. Dazu
   `npx tsc --noEmit` und `npm run build`. Dann **anhalten und auf Belal warten.**

### Schritt 2 — Zustände vervollständigen

Das ist der Teil, den der Nutzer sofort spürt, auch wenn er ihn nicht benennen kann.

9. **Zustandsmatrix für jedes bedienbare Element** (Knopf, Zeile, Kachel, Reiter, Eingabefeld,
   Auswahl): `Ruhe · Hover · Aktiv (gedrückt) · Fokus · Deaktiviert · Arbeitet`. Kein Element darf
   einen dieser sechs Zustände offen lassen. Definiere sie **einmal** zentral über die
   Kanon-Klassen, nicht pro Bauteil.
10. **Fokus sichtbar machen.** Ein Token `--p2-focus-ring` und eine Regel, die für alle
    bedienbaren Elemente gilt. Jedes `outline: none` (7 Stellen) bekommt im **gleichen** Regelblock
    einen Ersatz — Ring oder `box-shadow`-Ring. Ohne Ersatz wird `outline: none` gelöscht.
    Prüfung: mit der Tabulatortaste durch Vorgangsliste, Detail und „Mehr" — an jeder Station ist
    zu sehen, wo man steht.
11. **Ladezustand einführen.** `aria-busy="true"` auf `PortalButton` erzeugt: gedämpfte Fläche,
    Beschriftung bleibt stehen (kein Textsprung), kleiner Indikator, `pointer-events: none`.
    Danach jede Aktion im Portal, die auf Netz oder Server wartet, auf `aria-busy` umstellen —
    Absenden, Freigabe, Ablehnen, PDF, Datei-Upload, Anmeldung. Das ist die Ursache dafür, dass man
    zweimal klickt: heute passiert nach dem Klick sichtbar nichts.
12. Trefferflächen: jede Kanon-Klasse für ein bedienbares Element bekommt im CSS mindestens
    `min-height: 44px` und `min-width: 44px` auf dem Telefon. Im Quelltext sicherstellen, nicht
    im Browser messen.
13. **Anhalten.** Beleg als Liste aus dem Quelltext, kein Browser: für jede Kanon-Klasse für
    bedienbare Elemente eine Zeile, welche der sechs Zustände im CSS definiert sind. Erwartung:
    überall alle sechs. Dazu die Liste der Aktionen, die auf `aria-busy` umgestellt wurden.
    Dann auf Belal warten.

### Schritt 3 — Farben, widersprüchliche Rückfallwerte, Absicherung

**Zuerst der Fund, der unter allem anderen liegt.** Die Tokens widersprechen sich selbst. Jeder
Rückfallwert in `var(--token, wert)` ist eine zweite, versteckte Definition desselben Tokens — und
im Portal sind sie uneinheitlich:

| Token | verschiedene Rückfallwerte im Stylesheet |
|---|---|
| `--p2-line` | **5**: `#dfe4e0`, `rgba(0,0,0,.08)`, `rgba(0,0,0,.09)`, `rgba(20,32,25,.1)`, `rgba(20,32,25,.2)` |
| `--p2-ink` | 2: `#142019`, `#16201b` |
| `--p2-bg` | 2: `#f5f6f4`, `#ffffff` |
| `--p2-danger` | 2: `#a1242a`, `#b42318` |
| `--p2-faint` | 2: `#6a746f`, `#8a938e` |
| `--p2-selected` | Definition `#ffffff`, Rückfallwert `#f0f2f0` |
| `--p2-radius-md` / `-sm` | Rückfallwerte `12px` / `9px`, Tokens sind `18px` / `12px` |

14. **Alle Rückfallwerte entfernen.** `var(--token, wert)` wird überall zu `var(--token)`. Die
    Tokens sind im selben Stylesheet definiert; ein Rückfallwert kann hier gar nicht greifen, er
    stiftet nur Verwirrung darüber, welcher Wert gilt. Wo ein Rückfallwert vom Token abweicht, gilt
    **das Token** — abweichende Rückfallwerte sind Altlast, keine Absicht. Die Liste oben im
    Bericht abhaken.
15. Die 158 rohen Hex-Werte auf die vorhandenen Farb-Tokens abbilden. Was sich nicht abbilden
    lässt, im Bericht auflisten mit Stelle und Verwendungszweck — **keine** neuen Farbtokens
    anlegen, das entscheidet Belal.

14. Die 158 rohen Hex-Werte auf die vorhandenen Farb-Tokens abbilden. Was sich nicht abbilden
    lässt, im Bericht auflisten mit Stelle und Verwendungszweck — **keine** neuen Farbtokens
    anlegen, das entscheidet Belal.
16. Guard `scripts/check-portal-design-tokens.mjs`, bricht den Build ab bei:
    - `border-radius` mit rohem Wert (außer `0` und `50%`),
    - `box-shadow` mit rohem Wert,
    - `gap` / `padding` / `margin` mit einem Pixelwert, der nicht auf der Sechser-Skala liegt,
    - `outline: none` oder `outline: 0` ohne Fokus-Ersatz im gleichen Regelblock,
    - rohem Hex außerhalb der Token-Definitionsblöcke,
    - **jedem `var(--…, …)` mit Rückfallwert** — ein Token hat genau eine Definition.
    Für den Altbestand eine Ausnahmeliste `scripts/portal-design-allowlist.txt`, die beim Anlegen
    die Restfälle enthält und **nicht wachsen darf** — der Guard prüft ihre Zeilenzahl gegen einen
    festgeschriebenen Höchstwert und bricht, wenn eine Zeile dazukommt.
16. In die bestehende Guard-Kette vor `npm run build` einhängen.

### Abnahme

- Radien im Stylesheet: nur die fünf Tokens, `0` und `50%`. Eine Schreibweise für Pille.
- Kein `var(--p2-radius-*, …)` mit zweitem Argument mehr.
- Schatten: drei Tokens, keine rohen Definitionen.
- Sechs Abstandsstufen vorhanden und in Zeilen, Karten, Kacheln, Listen benutzt.
- Alle sechs Zustände je Kanon-Klasse im CSS definiert, als Liste im Bericht.
- Jede wartende Aktion auf `aria-busy` umgestellt; die Liste steht im Bericht.
- Trefferflächen: nicht messen, sondern im CSS sicherstellen, dass keine Kanon-Klasse für ein
  bedienbares Element unter 44px `min-height` bzw. `min-width` liegt.
- Der Guard schlägt an, wenn man testweise `border-radius: 7px` einfügt.
- `npx tsc --noEmit` und `npm run build` grün.

### Was dieser Auftrag ausdrücklich nicht macht

Keine neue Typo-Skala, keine neuen Layouts, keine umgebauten Screens, keine neuen Farben. Er setzt
die Werte durch, die vor einem Jahr schon entschieden wurden, und schließt die Zustände, die nie
gebaut wurden. Das Ergebnis ist ein Portal, das ruhig und bedienbar wirkt — nicht eines, das
aussieht wie neu entworfen. Das wäre der nächste, größere Schritt und braucht eine eigene Freigabe.

### Bericht

Nach `docs/PORTAL-PATTERN-KATALOG.md` und in den Commit-Text: Radien-Zuordnung als Tabelle
(alt → neu), die drei Schatten und was sich ihnen nicht zuordnen ließ, die vier Dichte-Variablen und
wo sie greifen, die Liste der Trefferflächen-Verstöße, die nicht zuordenbaren Farben und die
Startzeilenzahl der Ausnahmeliste.
