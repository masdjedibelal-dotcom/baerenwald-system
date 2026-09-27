# Auftrag A · Teil 5 — Portal: `preis_kunde` nachziehen

Repo: **baerenwald** (Website + Portale). Eigener Branch, ein Commit.
Teil 1 hat nur das CRM repariert.

---

## Teil 5: Die Spalte, die es nicht gibt — jetzt im Portal

> **Grundregel: keine Prüfung im Browser.** Keine Screenshots, kein Playwright, kein Dev-Server,
> kein Login, kein E2E-Test. Nachweis nur über `grep`, `npx tsc --noEmit`, `npm run build`.
> Am Ende anhalten.

### Befund

`preis_kunde` kommt im Portal an **6 Fundstellen** vor. Die Spalte existiert in keiner Umgebung —
sie steht in keiner Migration und in keinem generierten Typ. Jede Abfrage, die sie anfordert,
scheitert; jeder Schreibvorgang, der sie setzt, ebenfalls. Im CRM hat genau das dazu geführt, dass
eine angenommene Regieposition nie im Angebot landete, während die Oberfläche Erfolg meldete.

Die echten Spalten von `auftrag_positionen`:
- **`preis_fix`** — Kundenpreis der Zeile (im CRM heißt die Variable an einer Stelle `vk`)
- **`preis_partner`** — was der Partner bekommt
- `lohn_fix`, `material_fix`, `stundensatz`, `menge`, `preis_alt`, `einkauf_preis`

### Aufgabe

1. **Zuerst auflisten, dann ändern.** `grep -rn "preis_kunde" src/` und für jede der 6 Stellen
   feststellen, **welche Zielgruppe** sie bedient:
   - Handwerkerportal (`src/components/partner/…`, Partner-Abfragen) → **`preis_partner`**
   - Kundenportal, HV-Portal, Eigentümer, Mieter → **`preis_fix`**
   - geteilter Baustein → die Seite muss von außen kommen, nicht im Baustein geraten werden

   Diese Liste kommt **vor** der Änderung in den Bericht. Pauschal auf `preis_fix` ersetzen wäre
   falsch: dann sieht der Handwerker den Kundenpreis, und das ist kein Anzeigefehler, sondern ein
   Geschäftsvorfall.

2. Ersetzen gemäß dieser Zuordnung — in `.select('…')`-Zeichenketten, in Feldzugriffen, in
   `insert`/`update`-Objekten und in Typdefinitionen, die die Spalte erwähnen.

3. Danach muss `grep -rn "preis_kunde" src/` **0 Treffer** liefern.

4. Wenn eine Stelle sich nicht eindeutig zuordnen lässt: **nicht raten.** Stelle benennen,
   anhalten, Belal entscheiden lassen.

5. Den Spalten-Guard erneut laufen lassen und die Zahl der Verstöße vorher / nachher nennen.
   Weitere Treffer, die dabei auftauchen, **nur auflisten** — nicht mitreparieren.

### Abnahme

- `grep -rn "preis_kunde" src/` → 0
- Kein `preis_fix` unter `src/components/partner/`, kein `preis_partner` in kundenseitigen
  Bausteinen (falls doch, im Bericht begründen)
- `npx tsc --noEmit` grün
- `npm run build` bleibt am Spalten-Guard rot, solange dessen Grundlinie nicht gesetzt ist — das
  ist bekannt und **nicht** Teil dieses Auftrags

### Bericht

Die Zuordnungstabelle aus Punkt 1 (Stelle → Zielgruppe → neue Spalte), die Guard-Zahlen vorher /
nachher, und alles, was unter Punkt 4 offengeblieben ist.

Commit: `fix(portal): preis_kunde existiert nicht — auf die richtige Preisspalte`
