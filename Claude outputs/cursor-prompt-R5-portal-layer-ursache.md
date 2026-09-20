# Cursor-Prompt R5 — Die eine Ursache hinter den Portal-Designfehlern

Kopiere alles ab der Trennlinie in Cursor. Eigener Branch, eigener Commit.
**Dieser Auftrag hat Vorrang vor weiteren Einzelkorrekturen am Portal.**
Er ist in drei Schritte geteilt. Nach Schritt 1 **anhalten und Ergebnis zeigen**, bevor Schritt 2 beginnt.

---

## Auftrag R5: `action={false}` wirkungslos — eine CSS-Regel erzeugt fast alle Portal-Layoutfehler

**Befund. Nachgeprüft, nicht vermutet.**

`PortalButton` hat eine Schnittstelle, um die Button-Optik abzuschalten: `action={false}`
(`src/components/portal/PortalButton.tsx:40`). Dann wird `portal-action-btn` und die Variantenklasse
nicht gesetzt — die Absicht ist klar und richtig: „dieser Button ist ein Container, keine Schaltfläche."
**49 Aufrufstellen nutzen das.** Es wirkt an keiner einzigen.

Grund: `src/app/globals.css` hat einen Block `@layer components { … }`, der bei Zeile 575 beginnt und
bei **Zeile 6006** endet. Bei **Zeile 6340**, also **außerhalb jeder Layer**, steht:

```css
.portal-ui .portal-btn {
  min-height: var(--portal-btn-h);
  height: var(--portal-btn-h);      /* 46px, fest */
  padding-left/right: var(--portal-btn-px);
  font-size / font-weight: 600;
  border-radius: var(--portal-btn-radius);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
}
```

Unlayered CSS gewinnt in der Kaskade **immer** gegen Regeln innerhalb einer `@layer` — unabhängig von
Spezifität, unabhängig von der Reihenfolge. `portal-btn` wird aber **immer** gesetzt, auch bei
`action={false}`. Damit bekommt jeder Container feste 46px Höhe, mittige Ausrichtung in beide
Richtungen, 14px Radius und 15px/600 Schrift — und keine Komponentenklasse kann das zurücknehmen,
weil alle diese Klassen (`.portal-mehr-tile`, `.portal-objekt-card-body`, `.portal-entity-card-hit`,
`.portal-list-card-main`, `.portal-detail-tab`, `.portal-entity-list__hit`) **innerhalb** der Layer stehen.

Das erklärt die am Gerät fotografierten Fehler vollständig:

| Beobachtung am Telefon | Mechanik |
|---|---|
| Icon der „Mehr"-Kacheln liegt über der Beschriftung und über der Unterzeile | Kachel ist auf 46px fixiert, Inhalt ist ~90px, `align-items/justify-content: center` → Inhalt quillt **oben und unten** symmetrisch heraus |
| Titel und Adresse laufen aus der Objektkarte | dieselbe 46px-Klemme auf `.portal-objekt-card-body` mit drei gestapelten Zeilen |
| Weiße gerahmte Box **in** der weißen Karte | `action` steht per Default auf `true`; die Ghost-Variante malt `border: 1px solid` + `background: #fff` + Radius 14 |
| „Schadenmeldung geprüft20.09.2026", „WEG Gabelsbergerstraße Gabelsberger…" | Container ist `inline-flex` in Zeilenrichtung **ohne `gap`**; zwei Block-Kinder werden dadurch zu Flex-Geschwistern, und `align-items: center` macht deren `mt-2` wirkungslos |
| Papierkorb / „…" / Chevron sitzt außerhalb der inneren Box | er ist Geschwister des Buttons, nicht Teil davon |

**Wie bisher repariert wurde — und warum das aufhören muss.** Statt die Ursache zu beheben, wurden
handgeschriebene unlayered Ausnahmen pro Klasse angelegt. Aktuell stehen **12** davon in
`globals.css` (Zeilen 6091, 6105, 6124, 6145, 6152, 6175, 6190, 6199, 6215, 6221, 6227, 6233), mehrere
erst in den letzten Stunden ergänzt. Jede neue Zeile, Kachel oder Karte braucht in diesem Muster eine
weitere Ausnahme, die niemand nachträgt. Das ist kein Designsystem, das ist eine wachsende Liste von
Sonderfällen. Ab hier nicht mehr.

---

### Schritt 1 — Ursache beheben (klein, große Reichweite). Danach anhalten.

1. Die Größen- und Optikregeln aus der unlayered Regel `.portal-ui .portal-btn` (Zeile ~6340)
   **entfernen**. Sie sind fachlich eine Dublette von `.portal-action-btn`
   (`globals.css:1675-1691`), die dieselben Werte bereits setzt.
2. Damit die Größen weiterhin gegen die unlayered Marketing-Pills (`.btn-pill-*`) gewinnen — das war
   der ursprüngliche Anlass für die Dublette, siehe Kommentar `globals.css:1669` — wird derselbe
   Block **unlayered als `.portal-ui .portal-action-btn`** angelegt, direkt an der Stelle, wo bisher
   `.portal-ui .portal-btn` stand. Also: identische Deklarationen, nur der Selektor wechselt von
   `.portal-btn` auf `.portal-action-btn`.
3. Dasselbe für `.portal-ui .portal-btn-compact` (Zeile ~6357): Selektor auf
   `.portal-ui .portal-action-btn.portal-btn-compact` ändern, damit ein kompakter **Container**
   ebenfalls chromfrei bleibt.
4. `portal-btn` behält ausschließlich, was für Container und Schaltflächen gleichermaßen gelten
   soll: `box-sizing: border-box`, `cursor: pointer`, Schrift erbt. Kein `height`, kein `padding`,
   kein `border-radius`, kein `display`, kein `align-items`, kein `justify-content`, kein
   `font-size`, kein `font-weight`.
5. Alle **12** handgeschriebenen unlayered Zwillinge `.portal-ui .portal-btn.*` löschen. Sie werden
   überflüssig, sobald `portal-btn` keine Optik mehr mitbringt. Wenn eine der betroffenen Klassen
   danach etwas vermisst, gehört das in die Klasse selbst, innerhalb der Layer — nicht in eine neue
   unlayered Ausnahme.
6. **Anhalten.** Baue das Portal, ruf bei 390px Breite diese sechs Screens auf und zeig je einen
   Screenshot: HV-Portal „Mehr", HV-Portal „Objekte", HV-Vorgangsdetail „Fensterscheibe kaputt",
   Hausmeister-Befundliste, Vorgangsliste, Objekt-Einheiten-Tab. Erst danach Schritt 2.
   Erwartung: die Kacheln und Kartenkörper sind so hoch wie ihr Inhalt, Icons liegen nicht mehr
   über Text. Erwartbar kaputt oder hässlich sind danach die Abstände — das ist Schritt 2.

### Schritt 2 — Container sauber stapeln, Text nicht mehr kollidieren lassen

7. Jede Aufrufstelle, die `PortalButton` als **Container** benutzt, bekommt `action={false}` (sofern
   nicht vorhanden) und eine Klasse, die den Inhalt **stapelt** statt ihn in eine Zeile zu drücken:
   `display: flex; flex-direction: column; align-items: flex-start; text-align: left;` plus ein
   `gap` aus Punkt 9. Betroffen sind mindestens:
   - `src/components/org/OrgHmBefundPanel.tsx` (Befundzeilen)
   - `src/components/shared/PortalEntityList.tsx:67` (`.portal-entity-card-hit`) und der
     Desktop-Zweig `.portal-entity-list__hit`
   - `src/components/org/OrganisationObjektCard.tsx:72` (`.portal-objekt-card-body`)
   - `src/components/org/OrganisationMehrScreen.tsx:38` (`.portal-mehr-tile`)
   - `src/components/org/OrganisationObjektEinheitenTab.tsx:664` (Mieterzeile)
   - `src/components/portal/PortalNotificationBell.tsx:126`
   - `src/components/shared/PortalListCard.tsx:263` (`.portal-list-card-main`)
   Prüfe zusätzlich die restlichen Ghost-Verwendungen ohne `action={false}`
   (`grep -rn "<PortalButton" src/ | grep -v "action={false}" | grep ghost`) und entscheide je Stelle:
   echte Schaltfläche → bleibt; Container → umstellen. Liste beides im Bericht auf.
8. **Die Box-in-Box-Optik auflösen.** Wo eine Karte schon eine weiße Fläche mit Rahmen und Radius
   liefert, darf die Zeile darin keine zweite bekommen. Konkret: innere Fläche entfernen bei
   `PortalDetailCard → PortalEntityList` (`OrganisationObjektEinheitenTab.tsx:721`,
   `OrganisationObjektKontaktePanel.tsx:246`, `OrganisationObjektPruefpflichtenPanel.tsx:245`),
   bei `PortalDetailCard → PortalListCard` (`OrganisationObjektDetail.tsx:914`,
   `OrganisationEingangPanel.tsx:752`) und in `OrgHmBefundPanel.tsx:142`.
   Regel für das ganze Portal, ab jetzt gültig: **eine Fläche pro Ebene.** Trennung innerhalb einer
   Karte geschieht durch eine 0,5px-Trennlinie und Abstand, nicht durch eine zweite Karte.
   `PortalEntityCard.tsx` hat dasselbe Muster fest eingebaut und **null Aufrufstellen** — löschen.
9. **Abstandsskala einführen.** Das Portal hat heute **keine** Abstands-Tokens: `--p2-space-*` und
   `--p2-gap-*` existieren nicht, `tailwind.config.ts:164` kennt nur `header` und `footer`, und alle
   Abstände sind pro Regel handgetippt (`gap: 2px`, `8px`, `9px`, `11px`, `12px`, `gap-1.5`,
   `gap-2`, `gap-2.5`, `gap-3`, `gap-3.5`, `space-y-3`, `space-y-3.5`, …). `.portal-list-stack` ist
   zweimal deklariert und widerspricht sich (`gap: 9px` gegen `gap: 11px`).
   Lege in `src/lib/portal2/tokens.ts` neben den vorhandenen Radien und Schriftgrößen eine
   Abstandsskala an — **sechs** Werte, keine mehr: `2 · 4 · 8 · 12 · 16 · 24`. Als CSS-Variablen
   ausspielen wie die Radien. Ersetze in allen in Schritt 2 angefassten Regeln die handgetippten
   Werte durch Tokens. Die doppelte `.portal-list-stack`-Deklaration auf **eine** reduzieren.
   Das Portal komplett auf Tokens umzustellen ist **nicht** Teil dieses Auftrags — nur die
   angefassten Stellen.

### Schritt 3 — Absichern

10. Guard `scripts/check-portal-layer.mjs`, bricht den Build ab bei:
    - einer unlayered Regel in `src/app/globals.css`, deren Selektor `.portal-btn`
      oder `.portal-btn-compact` enthält (also: kein neuer handgeschriebener Zwilling);
    - `<PortalButton` mit `variant="ghost"` ohne `action={false}`, wenn im Kindinhalt mehr als ein
      Element-Knoten steht (Heuristik reicht: mehr als ein `<` im Kindblock) — das ist immer ein
      Container;
    - einem `gap`- oder `space-y`-Wert in neu hinzugefügten Regeln, der nicht auf der Skala aus
      Punkt 9 liegt. Für Altbestand eine Ausnahmeliste `scripts/portal-gap-allowlist.txt`, die
      **nur** bestehende Zeilen enthält und nicht wachsen darf.
11. Ein Playwright-Test pro betroffenem Screen, der die Klemme messbar macht: Höhe des Containers
    vergleichen mit `scrollHeight` des Inhalts. Bei Überlauf (`scrollHeight > clientHeight + 1`)
    schlägt der Test fehl. Das ist die Prüfung, die „Icon liegt auf dem Text" maschinell erkennt —
    vorher konnte das kein Test sehen, deshalb ist es monatelang stehen geblieben.
12. Unteren Navigationsbalken freistellen. Platz reserviert heute ausschließlich
    `.portal-shell-main--padded` (`globals.css:5342`). Ohne Reservierung sind:
    `.portal-shell-main--chrome-hidden` (`:5348`, Padding 0), `PortalLegalFooter` (nur `pb-2`),
    `.portal-shell-fab` (`:5801`), die Detail-CTA-Leiste (deren Body-Klasse erst in einem
    `useEffect` gesetzt wird, also beim ersten Aufbau fehlt, `PortalEntityDetailLayout.tsx:138-154`),
    sowie `src/app/portal/error.tsx:13`, `src/app/portal/not-found.tsx:6` und
    `PortalAuthFrame.tsx:51`. Alle auf dieselbe Variable umstellen. `--portal-detail-actions-h` ist
    mit `5.25rem` fest verdrahtet — real messen (ResizeObserver auf die CTA-Leiste) und als
    Variable setzen.
13. `OrganisationObjektCover.tsx:121` zieht jedes Bild mit `object-cover` auf 152px Höhe. Bei einem
    Logo als Objektbild ergibt das den verzerrten Balken vom Gerätetest. Wenn das Bild breiter als
    hoch und klein ist (Logo-Verdacht), auf `object-fit: contain` mit ruhigem Hintergrund
    umschalten. Schwelle festlegen und im Bericht nennen.

### Abnahme

- `grep -c "^\.portal-ui \.portal-btn\." src/app/globals.css` → **0**.
- Alle 49 Stellen mit `action={false}` erzeugen nachweislich einen Button ohne Höhe, Rahmen,
  Radius, Polsterung und ohne mittige Ausrichtung (in den Entwicklerwerkzeugen an zwei Beispielen
  gegenprüfen und im Bericht zeigen).
- Die Überlauf-Tests aus Punkt 11 laufen und schlagen bei zurückgedrehtem Schritt 1 fehl.
- Sichtprüfung bei 390px und 360px auf den sechs Screens aus Punkt 6: keine Box in der Box, kein
  Icon über Text, kein Text ohne Abstand zum Wert, nichts hinter der Navigationsleiste.
- `npx tsc --noEmit` und `npm run build` grün.

### Bericht

Nach `docs/PORTAL-PATTERN-KATALOG.md` und in den Commit-Text: die gelöschten Zwillinge, die Liste
der umgestellten Aufrufstellen mit Entscheidung Container/Schaltfläche, die Abstandsskala, die
Stellen mit neu reserviertem Platz für die Navigationsleiste und die Schwelle aus Punkt 13.

**Nicht setzen:** kein Häkchen in `audit-status.mjs`, das der Guard oder die Tests nicht selbst
messen. Und keine neue unlayered Ausnahme, unter keinen Umständen — wenn etwas nur so lösbar
scheint, im Bericht die Stelle benennen und offen lassen.
