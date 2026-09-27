# FIX 7 · CRM — Partner-Aufgabe als eigene Ebene

Repo: **baerenwald-system**. Eigener Branch. Drei Commits, nach jedem anhalten.

> **Keine Prüfung im Browser**, kein Dev-Server, kein Login. Nachweis über `grep`,
> `npx tsc --noEmit`.

## Entscheidung von Belal

**Variante C:** eine eigene Partner-Aufgabe, die Titel und Beschreibung hält und auf mehrere
Positionen verweist. **Umfang: nur die Auftragszuweisung**, das Angebot wird später gespiegelt.

Begründung, warum nicht A: `auftrag_handwerker` hat genau eine Zeile je Partner je Auftrag. Bekäme
derselbe Partner an einem Auftrag zwei getrennte Pakete, könnten sie sich nur einen Text teilen.

## Grundregel, die alles andere bestimmt

**Die Gruppierung ist Darstellung, keine Änderung der Arbeitseinheiten.** Zeiterfassung, Status,
Fortschritt, Regie und Abrechnung laufen **weiterhin je Position**. Die Aufgabe ist die
Überschrift, unter der der Partner seine Positionen sieht — nicht ein Ersatz dafür.

Wer das verwechselt, zerlegt die Zeiterfassung und die Regie-Abrechnung, die gerade erst gebaut
wurden.

---

### Commit 1 — Datenmodell

1. Neue Migration mit **heutigem** Zeitstempel (niemals eine bestehende Datei ändern):
   Tabelle `auftrag_partner_aufgaben`
   - `id uuid primary key default gen_random_uuid()`
   - `auftrag_id uuid not null references auftraege(id) on delete cascade`
   - `handwerker_id uuid not null references handwerker(id)`
   - `titel text null` · `beschreibung text null` — **leer bedeutet: LV-Text der Positionen gilt**
   - `sort_order integer null` · `created_at timestamptz default now()`
   - Index auf `(auftrag_id, handwerker_id)`
2. Auf `auftrag_positionen` eine Spalte `partner_aufgabe_id uuid null references
   auftrag_partner_aufgaben(id) on delete set null`. Eine Position gehört zu höchstens einer
   Aufgabe — deshalb eine Spalte und **keine** Zwischentabelle.
3. Kommentare auf Tabelle und Spalten, die die Grundregel oben festhalten: Gruppierung für die
   Partneransicht; Abrechnung und Zeiterfassung bleiben je Position.
4. Typdatei von Hand ergänzen wie bei `stundensatz_kunde`, mit demselben Kommentarmuster
   (`// HAND ERGÄNZT <Datum> …`). Kein `supabase gen types` möglich.
5. **Verhältnis zu den vorhandenen Feldern klären und im Bericht festhalten:** auf
   `auftrag_handwerker` und `auftrag_positionen` gibt es bereits `absprachen`, auf Positionen
   zusätzlich `notizen_intern`. Sag je Feld in einem Satz, wofür es künftig steht und warum die
   neuen Felder es nicht doppeln. Wenn du zu dem Schluss kommst, dass `absprachen` den Zweck
   bereits erfüllt: **anhalten und melden**, nicht trotzdem bauen.

**Anhalten.** Commit: `feat(crm): Partner-Aufgabe als Gruppierung über Auftragspositionen`

---

### Commit 2 — Zuweisung im CRM

6. Beim Zuweisen von Positionen an einen Partner — einzeln **und** mehrfach — entsteht eine
   Partner-Aufgabe, und die gewählten Positionen bekommen deren `partner_aufgabe_id`.
7. Im Zuweisungsdialog zwei optionale Felder: **Titel für den Partner** und **Beschreibung für
   den Partner**. Leer lassen ist der Normalfall und ausdrücklich erlaubt — dann sieht der Partner
   die LV-Texte wie bisher. Kein Pflichtfeld, keine Vorbelegung mit dem LV-Text (sonst weiß später
   niemand, ob der Text bewusst gesetzt wurde).
8. Nachträglich änderbar: Titel und Beschreibung einer bestehenden Aufgabe lassen sich bearbeiten,
   und Positionen lassen sich einer anderen Aufgabe zuordnen oder herauslösen.
9. **Der Fehler, der weg muss:** heute überschreibt das Einzel-Sheet die Kunden-Bezeichnung
   `leistung_name`, wenn man den Text für den Partner ändert. Das ist eine Datenbeschädigung —
   die Kundenrechnung und das Angebot tragen danach die Partnerformulierung. Finde die Stelle
   (`grep -rn "leistung_name" src/components/auftraege/ src/app/\(dashboard\)/auftraege/`) und
   trenne beides sauber: Partnertext schreibt **ausschließlich** in die neuen Felder,
   `leistung_name` bleibt dem Kunden vorbehalten.
   Prüfe außerdem, ob dieser Fehler bereits Daten verändert hat — wenn du Positionen findest,
   deren `leistung_name` nach einer Partnerzuweisung überschrieben wurde, **melden statt
   reparieren**; eine Datenkorrektur entscheidet Belal.
10. Schreibfehler brechen ab, mit Text aus `src/lib/copy/errors`. Keine Erfolgsmeldung auf einen
    fehlgeschlagenen Schreibvorgang.

**Anhalten.** Commit: `feat(crm): Partner-Titel und -Beschreibung bei der Zuweisung`

---

### Commit 3 — Anzeige im CRM und Absicherung

11. Im CRM bleibt alles positionsbasiert. Zusätzlich wird sichtbar, welche Positionen zu welcher
    Partner-Aufgabe gehören und welchen Titel der Partner sieht — damit man im Gespräch mit dem
    Handwerker dieselbe Sprache benutzt.
12. Guard `scripts/check-partner-text-trennung.mjs`: bricht ab, wenn ein Schreibvorgang
    `leistung_name` in derselben Funktion setzt, in der auch `partner_titel`,
    `partner_beschreibung` oder `partner_aufgabe_id` gesetzt werden. Das ist die maschinelle
    Absicherung gegen Punkt 9. In die Guard-Kette vor `npm run build`.

**Anhalten.** Commit: `feat(crm): Partner-Aufgabe im Detail sichtbar, Guard gegen Textvermischung`

---

## Abnahme

- Zeiterfassung, Positionsstatus, Regie und Abrechnung arbeiten unverändert je Position
  (per `grep` belegen: keine dieser Stellen liest `partner_aufgabe_id`)
- Leerer Partnertitel führt nachweislich zum LV-Text, nicht zu einer leeren Überschrift
- Kein Codepfad schreibt Partnertext nach `leistung_name`
- Der neue Guard schlägt an, wenn man beides testweise in einer Funktion setzt
- `npx tsc --noEmit` grün

## Bericht

Die Klärung aus Punkt 5 (Verhältnis zu `absprachen` / `notizen_intern`), die gefundene Stelle aus
Punkt 9 und ob dort bereits Daten beschädigt wurden, und die Liste der Stellen, die weiterhin
positionsbasiert arbeiten.

**Nicht in diesem Auftrag:** die Anzeige im Partnerportal (FIX7-Portal) und die Spiegelung auf die
Angebotszuweisung.
