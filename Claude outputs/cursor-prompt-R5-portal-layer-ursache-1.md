# Cursor-Prompt R5 — Die eine Ursache hinter den Portal-Designfehlern

Kopiere alles ab der Trennlinie in Cursor. Eigener Branch, eigener Commit.
**Dieser Auftrag hat Vorrang vor weiteren Einzelkorrekturen am Portal.**
Er ist in drei Schritte geteilt. Nach Schritt 1 **anhalten und Ergebnis zeigen**, bevor Schritt 2 beginnt.

> **Grundregel für den ganzen Auftrag: keine Prüfung im Browser.** Keine Screenshots, kein
> Playwright, kein Messskript, kein Dev-Server, kein Login, kein E2E-Test. Wenn ein Schritt eine
> Anmeldung, einen laufenden Server oder Testdaten zu brauchen scheint, ist der Schritt falsch
> verstanden — dann anhalten und nachfragen, statt eine Anmeldung zu bauen.
>
> Erlaubt als Nachweis ist ausschließlich: `grep`-Zählung über den Quelltext, `npx tsc --noEmit`,
> `npm run build`. Mehr nicht.
>
> **Ob es gut aussieht, entscheidet Belal am Gerät.** Das ist nicht deine Aufgabe und nicht
> automatisierbar. Liefere die Code-Änderung und die Zählwerte, dann halte an.

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
6. **Anhalten.** Kein Browser, kein Skript. Führe genau das aus und gib die drei Zahlen aus:

   ```bash
   grep -c "^\.portal-ui \.portal-btn {"        src/app/globals.css   # erwartet 0
   grep -c "^\.portal-ui \.portal-action-btn {" src/app/globals.css   # erwartet 1
   grep -c "^\.portal-ui \.portal-btn\."        src/app/globals.css   # erwartet 0
   ```

   Dazu `npx tsc --noEmit` und `npm run build`. Dann **halte an und warte auf Belal.**
   Er sieht sich das Portal selbst an. Erst wenn er freigibt, beginnt Schritt 2.
   Noch ungleichmäßige Abstände sind an dieser Stelle erwartet — das ist Schritt 2 und **kein**
   Anlass, jetzt nachzubessern.

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

### Schritt 2b — „Ausgewählt" ist überall grün

Nachgewiesene Folge derselben Ursache: weil `PortalButton` ohne `action={false}` das
Ghost-Chrome (`background: #fff`) mitzieht, gewinnt an vielen Stellen **Weiß** gegen den
eigentlich gemeinten grünen Auswahlzustand. Betroffen sind mindestens:
`PortalListeFilterChip` (und damit alle Listenfilter in HV-, Partner- und Kundenportal),
die Unternavigation in `PortalEinstellungenShell.tsx`, die Modus-Reiter in
`PartnerHwKalkulationScreen`, die Sprachwahl in `PortalEinstellungenMieter`, die Filter in
`PortalNotificationBell`.

**Entscheidung von Belal, gilt ohne Ausnahme:** Auswahl wird **grün gefüllt mit weißer Schrift**
dargestellt — Filter-Chips, Reiter, Einstellungs-Navigation und Mehrfachauswahl, am Schreibtisch
wie am Telefon. Keine weiße Pille als Auswahlzustand, auch nicht in der Seitenleiste.

14. Jede der genannten Stellen bekommt `action={false}`; der Auswahlzustand kommt ausschließlich
    aus der eigenen Klasse (`.portal-liste-chip--active` und Entsprechungen), nicht aus
    Tailwind-Klassen am Aufrufort und nicht aus einem Inline-Style. Vorhandene
    `bg-white` / `bg-accent` an diesen Aufrufstellen entfernen.
15. Das Token `--p2-selected` ist heute `#ffffff` (`globals.css:193`) — „ausgewählt" bedeutet dort
    also Weiß. Das war die Ursache im Token selbst. Setze `--p2-selected` auf das Auswahl-Grün und
    lege für die weiße Kartenfläche einen eigenen, ehrlich benannten Token an
    (`--p2-surface-card`). Alle sechs heutigen Verwendungen entsprechend richtigstellen.
16. Der unlayered Override für `.portal-detail-tab--active` mit `!important` wird **gelöscht**.
    Er war der Notbehelf für genau dieses Problem; nach Schritt 1 wirkt die normale Klasse.
    Wenn danach etwas fehlt, gehört es in die Klasse, nicht in einen neuen Override.
17. **Fake-Checkboxen ersetzen, nicht umfärben.** `PartnerPositionLebenszyklusList.tsx:922` baut
    eine Auswahl aus `PortalButton variant="primary"` mit `h-5 w-5` und `aria-pressed`. Das ist
    dreifach falsch: es ist semantisch ein Knopf statt einer Auswahl, es ist ein Nachbau der
    vorhandenen `PortalCheckbox` (39 Verwendungen im Repo), und `h-5` verliert gegen die unlayered
    46px-Regel, das Kästchen ist also gar nicht 20px hoch. Durch `PortalCheckbox` ersetzen.
    Dasselbe in `PortalListeFilterBar` (Objekt-Mehrfachauswahl). Suche mit
    `grep -rn "aria-pressed" src/components/` nach weiteren Nachbauten und liste sie im Bericht.

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
11. Kein Test, kein Browser. Der Guard aus Punkt 10 arbeitet rein auf dem Quelltext und genügt.
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
- Die Liste der umgestellten Aufrufstellen steht im Bericht, je Stelle mit der Entscheidung
  Container oder Schaltfläche.
- Die Sichtprüfung am Gerät macht Belal. Nicht behaupten, dass etwas „gut aussieht" — melden, was
  geändert wurde, und anhalten.
- `npx tsc --noEmit` und `npm run build` grün.

### Bericht

Nach `docs/PORTAL-PATTERN-KATALOG.md` und in den Commit-Text: die gelöschten Zwillinge, die Liste
der umgestellten Aufrufstellen mit Entscheidung Container/Schaltfläche, die Abstandsskala, die
Stellen mit neu reserviertem Platz für die Navigationsleiste und die Schwelle aus Punkt 13.

**Nicht setzen:** kein Häkchen in `audit-status.mjs`, das der Guard oder die Tests nicht selbst
messen. Und keine neue unlayered Ausnahme, unter keinen Umständen — wenn etwas nur so lösbar
scheint, im Bericht die Stelle benennen und offen lassen.
