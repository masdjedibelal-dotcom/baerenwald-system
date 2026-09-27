# Cursor-Auftrag A, Teil 2 — Guard gegen unbekannte DB-Spalten

Kopiere alles ab der Trennlinie in Cursor. Eigener Branch, ein Commit. Teil 1 ist erledigt.

---

## Teil 2: Spaltennamen in Zeichenketten prüfbar machen

> **Grundregel: keine Prüfung im Browser.** Keine Screenshots, kein Playwright, kein Dev-Server,
> kein Login, kein E2E-Test, keine Datenbankverbindung. Der Guard arbeitet **rein auf dem
> Quelltext**. Nachweis über die eigene Ausgabe des Guards, `npx tsc --noEmit`, `npm run build`.
> Am Ende anhalten.

### Warum

`preis_kunde` konnte lange überleben, weil der Spaltenname in einer **Zeichenkette** steht.
TypeScript sieht einen String und prüft nichts. Dieselbe Lücke hat im selben System schon
CSS-Werte in Strings und eine Postgres-Funktionssignatur in einem RPC-String durchgelassen.
Dieser Guard schließt die Klasse für Datenbankspalten.

### Umfang, gemessen — damit du nicht ins Blaue parst

| | Anzahl |
|---|---|
| `.from('…')`-Aufrufe im CRM | 1.822 |
| `.select(`-Aufrufe | 1.304 |
| Select-Strings mit `*` | 116 (werden übersprungen) |
| Verschachtelte Beziehungen insgesamt | **unter 100** |

Die verschachtelten Formen im Repo sind abzählbar — es gibt genau diese vier:

```
kunden(id, name)                    einfache Beziehung, Tabellenname = Beziehungsname
kunden:kunde_id(id, name)           Alias vor dem Doppelpunkt, Tabelle steht links
kunden!kunde_id(id, name)           Fremdschlüssel-Hinweis nach dem Ausrufezeichen
angebote!inner(lead_id)             Join-Modifikator
```

Es gibt **keine** Typumwandlungen (`::text`) und **keine** JSON-Pfade (`->>`) in Select-Strings.
Du musst also nur diese vier Formen können.

### Aufgabe

1. Neues Skript `scripts/check-db-spalten.mjs`.

2. **Wahrheitsquelle:** `src/types/supabase.ts`. Lies die `Row`-Blöcke je Eintrag unter `Tables`
   **und** unter `Views` und baue daraus eine Zuordnung `Tabellenname → Menge erlaubter Spalten`.
   Die Datei wird aus dem echten Schema erzeugt — sie ist die einzig zulässige Quelle. Keine
   handgepflegte Liste danebenlegen.

3. **Fundstellen sammeln:** Durchsuche `src/` nach `.from('<tabelle>')` und ordne jedem Fund die
   Aufrufkette zu, die daran hängt. Aus dieser Kette interessieren:
   - die Zeichenkette in `.select('…')`
   - die Schlüssel in `.insert({…})`, `.update({…})`, `.upsert({…})`, sofern das Objekt ein
     Literal ist
   - die erste Zeichenkette in `.eq('spalte', …)`, `.neq`, `.is`, `.in`, `.gt`, `.gte`, `.lt`,
     `.lte`, `.like`, `.ilike`, `.order('spalte'…)` — dort stehen ebenfalls Spaltennamen, und
     ein Tippfehler bleibt dort genauso unsichtbar

4. **Select-String zerlegen:** Kommas auf oberster Ebene trennen die Felder; Klammern gelten als
   Block. Je Feld:
   - `*` → überspringen, keine Prüfung
   - `alias:spalte` → die Spalte rechts prüfen
   - eine der vier verschachtelten Formen oben → Zieltabelle bestimmen (Name links vom `:`, vom
     `!` oder vor der Klammer), dann die Felder in der Klammer gegen **diese** Tabelle prüfen,
     rekursiv
   - sonst → einfacher Spaltenname, gegen die aktuelle Tabelle prüfen

5. **Im Zweifel überspringen, niemals raten.** Wenn die Tabelle einer Beziehung nicht eindeutig
   auflösbar ist, das `.from()` dynamisch ist (Variable statt Zeichenkette), der Select-String
   zusammengesetzt wird (Template-Literal mit `${…}`, Verkettung, aus einer Konstanten geladen),
   oder die Kette über mehrere Anweisungen verteilt ist: **nicht prüfen, sondern zählen.**

   Das ist die wichtigste Regel im ganzen Auftrag. Ein Guard, der Fehlalarme produziert, wird nach
   zwei Tagen abgeschaltet und hat dann nichts gebracht. Lieber eine Lücke als ein falscher Alarm.

   Ausgenommen sind die bereits als Konstante definierten Select-Strings (z. B. `RECHNUNG_SELECT`
   in `load-vorgaenge-liste.ts`): wenn die Konstante im selben Modul als Zeichenkettenliteral
   steht und eindeutig einer Tabelle zugeordnet werden kann, wird sie geprüft.

6. **Abbruch mit klarer Meldung:** Datei, Zeile, Tabelle, unbekannte Spalte, und — falls es eine
   ähnlich geschriebene echte Spalte gibt — ein Vorschlag („meintest du `preis_fix`?").

7. **Ausnahmeliste** `scripts/db-spalten-allowlist.txt`, ausschließlich für Fälle, die nach
   Punkt 5 geprüft werden könnten, aber begründet abweichen. Jede Zeile mit Begründung. Die Liste
   darf nicht wachsen: der Guard vergleicht ihre Zeilenzahl mit einem im Skript festgeschriebenen
   Höchstwert und bricht ab, wenn eine Zeile dazukommt.

8. **Einhängen:** in `package.json` als `check:db-spalten`, und in die bestehende Guard-Kette vor
   `npm run build`, an derselben Stelle wie die übrigen `scripts/check-*.mjs`.

9. **Auch im Portal** (`baerenwald`) einhängen. Dort gibt es eine eigene `src/types/supabase.ts`
   — die ist dort die Wahrheitsquelle.

10. **Gefundene Treffer nicht reparieren.** Wenn der Guard beim ersten Lauf weitere unbekannte
    Spalten findet: auflisten, in den Bericht schreiben, **anhalten**. Ob und wie die repariert
    werden, entscheidet Belal. Nicht nebenbei mitfixen — genau so entstehen die Aufträge, die
    ausufern.

### Abnahme

- `node scripts/check-db-spalten.mjs` läuft in beiden Repos durch und meldet am Ende drei Zahlen:
  geprüfte Fundstellen, übersprungene Fundstellen (mit Grund gruppiert), gefundene Verstöße.
- Testweise `.select('id, gibtesnicht')` an einer beliebigen Stelle → der Guard bricht ab und
  nennt Datei, Zeile, Tabelle und Spalte. Danach zurücknehmen.
- Testweise `.eq('gibtesnicht', 1)` → ebenso.
- Kein Fehlalarm im Bestand. Wenn doch einer auftaucht, ist Punkt 5 zu eng ausgelegt — dann die
  Erkennung lockern, **nicht** die Ausnahmeliste füllen.
- `npx tsc --noEmit` und `npm run build` grün in beiden Repos.

### Bericht

In den Commit-Text und nach `docs/TODO-ENTWICKLUNG.md`:
geprüft / übersprungen / Verstöße je Repo, die Gruppierung der Übersprungenen nach Grund, die
Startzeilenzahl der Ausnahmeliste, und die Liste der gefundenen unbekannten Spalten — **nur
gelistet, nicht repariert**.

Commit-Text: `feat(crm+portal): Guard gegen unbekannte DB-Spalten in Abfragen`

Danach anhalten. Teil 3 (verschluckte Schreibfehler im Regie-Pfad) kommt separat.
