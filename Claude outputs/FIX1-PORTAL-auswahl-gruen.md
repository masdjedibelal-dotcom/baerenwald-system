# FIX 1 · Portal — Auswahl ist grün, Checkboxen sind echte Checkboxen

Repo: **baerenwald**. Eigener Branch, ein Commit.

> **Keine Prüfung im Browser.** Kein Screenshot, kein Playwright, kein Dev-Server, kein Login.
> Nachweis nur über `grep`, `npx tsc --noEmit`. Am Ende anhalten.

## Befund

| | Ist |
|---|---|
| `--p2-selected` | `#ffffff` — das Token für „ausgewählt" ist weiß |
| Nachgebaute Checkboxen (`aria-pressed`) | 6 |
| `!important`-Sonderregel `portal-detail-tab--active` | steht noch |

Ursache ist dieselbe wie bei R5: `PortalButton` zieht ohne `action={false}` das Ghost-Chrome
(`background:#fff`) über den eigentlich grünen Auswahlzustand. Seit R5 Schritt 1 wirkt
`action={false}` — die Sonderregeln sind damit überflüssig.

**Entscheidung von Belal, gilt ohne Ausnahme:** Auswahl wird **grün gefüllt mit weißer Schrift**
dargestellt — Filter-Chips, Reiter, Einstellungs-Navigation und Mehrfachauswahl, am Schreibtisch
wie am Telefon. Keine weiße Pille als Auswahlzustand.

## Aufgabe

1. `--p2-selected` auf das Auswahl-Grün setzen. Für die weiße Kartenfläche einen eigenen Token
   `--p2-surface-card` anlegen und alle bisherigen Verwendungen richtigstellen, die tatsächlich
   die Kartenfläche meinen.

2. Diese Stellen bekommen `action={false}`, und der Auswahlzustand kommt ausschließlich aus der
   eigenen Klasse — nicht aus Tailwind am Aufrufort, nicht aus einem Inline-Style:
   - `PortalListeFilterChip` (und damit alle Listenfilter in HV-, Partner- und Kundenportal)
   - Unternavigation in `PortalEinstellungenShell.tsx` (mobil **und** Desktop)
   - Modus-Reiter in `PartnerHwKalkulationScreen`
   - Sprachwahl in `PortalEinstellungenMieter`
   - Filter in `PortalNotificationBell`
   Vorhandene `bg-white` / `bg-accent` an diesen Aufrufstellen entfernen.

3. Die 140 Ghost-Buttons ohne `action={false}` **nicht pauschal umstellen.** Viele sind echte
   Schaltflächen, bei denen die weiße Fläche richtig ist. Gehe sie durch und ordne jede Stelle
   zu: Schaltfläche (bleibt) oder Container/Auswahl (bekommt `action={false}`). Die Zuordnung
   kommt in den Bericht.

4. Die unlayered Sonderregel für `.portal-detail-tab--active` mit `!important` **löschen**. Sie
   war der Notbehelf für genau dieses Problem. Fehlt danach etwas, gehört es in die Klasse
   selbst, nicht in eine neue Sonderregel.

5. **Fake-Checkboxen ersetzen, nicht umfärben.** Sechs Stellen mit `aria-pressed`, darunter
   `PartnerPositionLebenszyklusList` (~Zeile 922) und `PortalListeFilterBar`. Das sind Knöpfe mit
   Checkbox-Optik: falsche Semantik für Tastatur und Screenreader, und `h-5 w-5` verliert
   ohnehin gegen die Button-Höhe. Durch `PortalCheckbox` ersetzen (39 bestehende Verwendungen als
   Muster).

6. Guard `scripts/check-auswahl-zustand.mjs`: bricht ab bei `aria-pressed` in
   `src/components/`, und bei einer neuen unlayered Regel, deren Selektor `--active` oder
   `--selected` enthält. Ausnahmeliste mit Begründung, die nicht wachsen darf. In die Guard-Kette
   vor `npm run build`.

## Abnahme

- `grep -rn "aria-pressed" src/components/` → 0
- `--p2-selected` ist nicht mehr `#ffffff`
- Keine `!important`-Sonderregel mehr für `portal-detail-tab--active`
- Zuordnungstabelle aus Punkt 3 vollständig im Bericht
- `npx tsc --noEmit` grün

Commit: `fix(portal): Auswahl grün statt weiß, echte Checkboxen`
