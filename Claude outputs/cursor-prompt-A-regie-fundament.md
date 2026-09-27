# Cursor-Auftrag A — Regie-Fundament: falsche Spalte, verschluckte Fehler, falsche Sperre

Kopiere alles ab der Trennlinie in Cursor. Eigener Branch, eigener Commit je Teil (1–4).
CRM-Repo (`baerenwald-system`).

---

## Auftrag A: Drei Fehler unter dem Regie-Ablauf beheben

> **Grundregel: keine Prüfung im Browser.** Keine Screenshots, kein Playwright, kein Messskript,
> kein Dev-Server, kein Login, kein E2E-Test. Wenn ein Schritt eine Anmeldung oder Testdaten zu
> brauchen scheint, ist der Schritt falsch verstanden — anhalten und nachfragen.
> Nachweis nur über `grep` auf dem Quelltext, `npx tsc --noEmit`, `npm run build`.
> **Die Sichtprüfung macht Belal.** Nach jedem Teil anhalten.

### Ausgangslage, nachgeprüft

Ein Handwerker meldete eine Regiearbeit, Bärenwald hat sie angenommen. Die Oberfläche meldete
Erfolg. Tatsächlich ist danach nichts passiert: keine Position im Angebot, keine Timeline für den
Kunden, keine Mail. Drei Ursachen übereinander.

---

### Teil 1 — Die Spalte `preis_kunde` existiert nicht

`preis_kunde` steht in **6 Dateien** im Code, in **0** Migrationen und **0**-mal in
`src/types/supabase.ts`. Die generierten Typen kommen aus dem echten Schema — die Spalte gibt es
also in keiner Umgebung, auch nicht auf Staging.

Der Kundenpreis einer Auftragsposition heißt **`preis_fix`**. Beleg:
`src/lib/auftraege/position-handwerker-view.ts:211` → `const vk = Math.max(0, pos.preis_fix ?? 0)`,
und `src/lib/auftraege/auftrag-positionen-rechnung.ts:39` nimmt `preis_fix` als Netto-Zeilenbetrag
für die Kundenrechnung. `preis_partner` ist die Gegenseite (was der Partner bekommt).

1. In allen sechs Dateien `preis_kunde` durch `preis_fix` ersetzen — sowohl in den
   `.select('…')`-Zeichenketten als auch beim `insert` und in den Feldzugriffen:
   - `src/app/(dashboard)/auftraege/partner-positions-anfrage-actions.ts` (Zeilen ~415, ~664, ~710-712)
   - `src/lib/copilot/crm-registry.ts:542,553`
   - `src/lib/copilot/entity-snapshot.ts:56`
   - `src/lib/copilot/crm-actions.ts:432`
   - `src/lib/copilot/read-document.ts:56`
2. Prüfen, ob an diesen Stellen fachlich wirklich der **Kundenpreis** gemeint ist. Bei
   `read-document.ts:56` steht heute `row.preis ?? row.preis_kunde ?? row.lohn_fix` — dort die
   Reihenfolge nach der Umstellung nochmal durchdenken und im Bericht begründen.
3. Danach muss `grep -rn "preis_kunde" src/` **0 Treffer** liefern.

**Anhalten.** Das ist ein eigener Commit: `fix(crm): preis_kunde existiert nicht — auf preis_fix`.

---

### Teil 2 — Guard gegen genau diese Fehlerklasse

Der Fehler konnte ein Jahr überleben, weil der Spaltenname in einer **Zeichenkette** steht.
TypeScript sieht einen String. Das ist im selben System schon dreimal passiert: CSS-Werte in
Strings, eine Postgres-Funktionssignatur in einem RPC-String, jetzt ein Spaltenname in einem
Select-String. Dieser Guard schließt die Klasse.

4. Neues Skript `scripts/check-db-spalten.mjs`:
   - liest die Tabellendefinitionen aus `src/types/supabase.ts` (die `Row`-Blöcke je Tabelle) und
     baut daraus eine Zuordnung Tabelle → erlaubte Spalten, inklusive der Views;
   - durchsucht `src/` nach dem Muster `.from('<tabelle>')` und sammelt die zugehörigen
     `.select('…')`-Zeichenketten sowie die Schlüssel in `.insert({…})` / `.update({…})` /
     `.upsert({…})`, wenn sie im selben Aufrufketten-Ausdruck stehen;
   - zerlegt die Select-Zeichenkette in Spaltennamen; eingebettete Beziehungen
     (`kunden(name, email)`, `leads!inner(id)`, `handwerker:handwerker_id(…)`) werden nach der
     Zieltabelle aufgelöst, soweit der Name eindeutig ist. Wo die Auflösung nicht eindeutig
     gelingt, **überspringen und im Bericht zählen** — lieber eine Lücke als ein Fehlalarm;
   - bricht ab, wenn ein Spaltenname in der Zieltabelle nicht existiert, und nennt Datei, Zeile,
     Tabelle und Spalte.
5. Ausnahmeliste `scripts/db-spalten-allowlist.txt` nur für die Fälle aus Punkt 4, die sich nicht
   auflösen lassen, jede Zeile mit Begründung. Die Liste darf nicht wachsen: der Guard prüft ihre
   Zeilenzahl gegen einen festgeschriebenen Höchstwert.
6. In `package.json` als `check:db-spalten` und in die bestehende Guard-Kette vor `npm run build`.
7. Denselben Guard im Portal-Repo (`baerenwald`) einhängen.
8. Im Bericht: wie viele Select-Zeichenketten geprüft wurden, wie viele übersprungen, und welche
   Treffer außer `preis_kunde` gefunden wurden. **Gefundene weitere Treffer nicht sofort
   reparieren** — auflisten und anhalten, das entscheidet Belal.

**Anhalten.** Eigener Commit: `feat(crm): Guard gegen unbekannte DB-Spalten in Select-Strings`.

---

### Teil 3 — Schreibfehler nicht mehr verschlucken (nur im Regie-Pfad)

Im Annahme-Pfad steht heute:

```ts
if (error3) logDbError('…:auftrag_positionen', error3)
```

und die Funktion läuft weiter. Deshalb meldete die Oberfläche „Angenommen", obwohl nichts
geschrieben wurde. Im ganzen CRM sind das grob **474 Schreibvorgänge**, die einen Datenbankfehler
protokollieren und weitermachen.

**Umfang dieses Auftrags: ausschließlich der Regie-/Partner-Positions-Pfad.** Der Rest wird
später in einem eigenen Auftrag angegangen — nicht jetzt anfassen.

9. In `src/app/(dashboard)/auftraege/partner-positions-anfrage-actions.ts` jeden Schreibvorgang
   so umstellen: schlägt er fehl, wird protokolliert **und** abgebrochen, mit einer
   Rückmeldung an die Oberfläche. Kein stilles Weiterlaufen.
10. Die Oberfläche zeigt den Fehler als verständlichen Satz aus `src/lib/copy/errors` — keine
    Postgres-Meldung, kein Spaltenname. Und sie meldet in diesem Fall **nicht** „Angenommen".
11. Die Annahme muss unteilbar sein: entweder Position anerkannt **und** in Auftrag/Angebot
    übernommen, oder nichts davon. Wenn die vorhandene Struktur das nicht hergibt, den Ablauf so
    ordnen, dass der Statuswechsel auf `anerkannt` **zuletzt** kommt — dann bleibt bei einem
    Abbruch der prüfbare Zustand erhalten statt eines halb angenommenen.
12. Im Bericht: Liste der umgestellten Schreibvorgänge in dieser Datei, und ob Punkt 11 über eine
    Transaktion oder über die Reihenfolge gelöst wurde.

**Anhalten.** Eigener Commit: `fix(crm): Regie-Annahme bricht bei DB-Fehler ab statt still weiter`.

---

### Teil 4 — „Auftrag bearbeiten" fragt das falsche Dokument

Heute entscheidet `angebotDarfFuerAuftragKorrektur` in
`src/lib/angebote/angebot-wizard-types.ts:472`:

```ts
return st === 'kunde_akzeptiert' || st === 'angenommen' || st === 'beauftragt'
```

Drei Befunde dazu:
- `beauftragt` steht **nicht** in `ANGEBOT_WRITE_STATUSES` — kein Codepfad kann diesen Wert
  setzen. Toter Ast.
- `angenommen` steht gleichzeitig in `PARTNER_ANNAHME_STATUSES`, bedeutet also je nach Herkunft
  Kundenannahme **oder** Handwerkerannahme. Die Sperre liest ihn als Kundenannahme.
- Beim Direktauftrag bleibt das Angebot auf `handwerker_akzeptiert`. Dieser Weg kann die Sperre
  **nie** erfüllen — keine Wartesituation, sondern eine Sackgasse.

Die Funktion heißt „Auftrag bearbeiten", befragt aber das Angebot. Bearbeitet wird der Auftrag.

13. Die Bedingung umstellen auf den **Auftrag**: bearbeitbar, wenn ein Auftrag existiert und zu
    diesem Auftrag noch keine Rechnung gestellt wurde (Entwürfe zählen nicht als gestellt).
    Damit gilt:
    | Fall | Ergebnis |
    |---|---|
    | Normalweg, Kunde hat angenommen | bearbeitbar |
    | Angebot beim Kunden, noch keine Entscheidung (kein Auftrag) | gesperrt |
    | Direktauftrag | bearbeitbar |
    | Rechnung gestellt | gesperrt, Hinweis auf den Korrekturweg über die Rechnung |
14. Kein neuer Angebotsstatus. Die Statusliste ist bereits überladen — siehe `angenommen`.
15. `beauftragt` aus der alten Erlaubnisliste entfernen oder die Funktion ganz ersetzen, je
    nachdem was nach Punkt 13 übrig bleibt. Kein toter Ast bleibt stehen.
16. Die Sperrmeldung neu formulieren: sie muss sagen, **warum** gesperrt ist und was stattdessen
    geht. „Korrektur nur nach Annahme — Angebot muss angenommen sein" war in Belals Fall schlicht
    falsch. Text aus `src/lib/copy/errors`.
17. Prüfen, ob `angebotStatusErlaubtImWizard` und `angebotWizardBearbeitenSperrgrund` mitgezogen
    werden müssen, und ob es weitere Aufrufstellen gibt
    (`grep -rn "angebotDarfFuerAuftragKorrektur\|forAuftragKorrektur" src/`).

**Anhalten.** Eigener Commit: `fix(crm): Auftrag-Korrektur prüft den Auftrag statt des Angebots`.

---

### Abnahme über alle vier Teile

- `grep -rn "preis_kunde" src/` → 0
- `node scripts/check-db-spalten.mjs` → grün in beiden Repos, Ausnahmeliste dokumentiert
- Der Guard schlägt an, wenn man testweise `.select('id, gibtesnicht')` einfügt
- Kein `logDbError` ohne Abbruch mehr in `partner-positions-anfrage-actions.ts`
- `npx tsc --noEmit` und `npm run build` grün

### Bericht

In den Commit-Text und nach `docs/TODO-ENTWICKLUNG.md`: je Teil was geändert wurde, die
Guard-Zahlen aus Punkt 8, die weiteren gefundenen Spaltentreffer (nur gelistet, nicht repariert)
und die Entscheidung aus Punkt 12.

**Nicht in diesem Auftrag:** der Bearbeiten-Schritt für Regie, die zwei Stundensätze, die Mails an
Handwerker und Kunde, die Summen in den Portalen. Das sind die Pakete B bis D.
