# Paket B · Portal — Jede Seite sieht ihren eigenen Satz

Repo: **baerenwald** (Website + Portale). Eigener Branch, ein Commit.
Voraussetzung: **B-CRM ist durch**, die Spalte `stundensatz_kunde` existiert und die Typen sind
neu erzeugt.

---

## Auftrag B-Portal: Partnersatz im Handwerkerportal, Kundensatz im Kundenportal

> **Grundregel: keine Prüfung im Browser.** Keine Screenshots, kein Playwright, kein Dev-Server,
> kein Login, kein E2E-Test. Nachweis nur über `grep`, `npx tsc --noEmit`, `npm run build`.
> Die Sichtprüfung macht Belal. Am Ende anhalten.

### Warum

Mit Paket B-CRM gibt es zwei Stundensätze: `stundensatz` ist der Partnersatz (was Bärenwald dem
Handwerker zahlt), `stundensatz_kunde` der Kundensatz (was der Kunde zahlt). Dazwischen liegt die
Marge.

Im Portal treffen beide Zielgruppen auf dieselben Daten. Wird hier die Seite verwechselt, sieht
der Handwerker, was Bärenwald am ihm verdient, oder der Kunde sieht den Einkaufspreis. Beides ist
kein Anzeigefehler, sondern ein Geschäftsvorfall.

### Aufgabe

1. **Bestandsaufnahme zuerst.** `grep -rn "stundensatz\|preis_partner\|preis_fix" src/
   --include=*.ts --include=*.tsx` und jede Fundstelle einer Zielgruppe zuordnen:
   - **Handwerkerportal** (`src/components/partner/…`) → Partnerseite
   - **Kundenportal / HV-Portal / Eigentümer / Mieter** (`src/components/portal/…`,
     `src/components/org/…`, `src/components/shared/…` soweit kundenseitig) → Kundenseite
   - **beides** (geteilte Bausteine, z. B. unter `shared/`) → der Baustein bekommt die Seite als
     Eigenschaft übergeben; er entscheidet **nicht** selbst
   Die Zuordnung kommt als Tabelle in den Bericht, bevor du etwas änderst.

2. **Handwerkerportal:** zeigt ausschließlich `stundensatz` und Beträge daraus. `stundensatz_kunde`
   darf dort nirgends ankommen — auch nicht im geladenen Datensatz. Wo eine Abfrage beide Spalten
   holt, im Handwerkerpfad die Kundenspalte aus dem `select` entfernen. Nicht nur ausblenden:
   was nicht geladen wird, kann auch nicht versehentlich gerendert werden.

3. **Kundenportal und HV-Portal:** zeigen ausschließlich `stundensatz_kunde` und Beträge daraus.
   Ist die Spalte leer (Altdaten), gilt `stundensatz` als Rückfall — dieselbe Regel wie im CRM,
   damit alte Vorgänge nicht plötzlich anders aussehen.

4. **Geteilte Bausteine** bekommen die Seite als ausdrückliche Eigenschaft, etwa
   `ansicht: "partner" | "kunde"`. Kein Erraten aus der Rolle im Baustein selbst, kein
   Standardwert — wer den Baustein benutzt, muss sich entscheiden. Fehlt die Eigenschaft, soll
   TypeScript meckern.

5. **Beschriftung:** Im Handwerkerportal heißt es „dein Stundensatz", im Kundenportal
   „Stundensatz". Texte aus `src/lib/portal-copy/…`, nicht im Baustein hart eintippen.

6. **Guard.** Neues Skript `scripts/check-preis-seiten.mjs`: bricht ab, wenn in einer Datei unter
   `src/components/partner/` der Bezeichner `stundensatz_kunde` oder `preis_fix` vorkommt, und
   umgekehrt, wenn in den kundenseitigen Ordnern `preis_partner` vorkommt. Ausnahmen nur über eine
   Liste mit Begründung, die nicht wachsen darf. In die Guard-Kette vor `npm run build`.

   Das ist die billigste Absicherung gegen genau den Fehler, der hier am teuersten wäre.

### Abnahme

- Die Zuordnungstabelle aus Punkt 1 liegt vollständig im Bericht, keine Fundstelle offen
- Kein `stundensatz_kunde` und kein `preis_fix` unter `src/components/partner/`
- Kein `preis_partner` in kundenseitigen Bausteinen
- Geteilte Bausteine haben die Seite als Pflichteigenschaft ohne Standardwert
- Der neue Guard schlägt an, wenn man testweise `stundensatz_kunde` in eine Partner-Datei schreibt
- `npx tsc --noEmit` und `npm run build` grün

### Bericht

Zuordnungstabelle, Liste der geteilten Bausteine mit neuer Eigenschaft, Name des Guards,
und — falls vorhanden — Stellen, an denen heute schon die falsche Seite angezeigt wurde. Die sind
gesondert zu nennen: das wäre ein Fehler, der schon live war.

**Nicht in diesem Auftrag:** die Gesamtsummen und die Sichtbarkeit von Regie im Kundenportal —
das ist Paket D-Portal.
