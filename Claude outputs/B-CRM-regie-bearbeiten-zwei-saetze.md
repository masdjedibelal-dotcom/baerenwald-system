# Paket B · CRM — Regie bearbeiten, zwei Stundensätze

Repo: **baerenwald-system**. Eigener Branch. Vier Commits, nach jedem anhalten.
Voraussetzung: Auftrag A (Teile 1–5) ist durch.

---

## Auftrag B-CRM: Prüfen und Korrigieren statt nur Annehmen oder Ablehnen

> **Grundregel: keine Prüfung im Browser.** Keine Screenshots, kein Playwright, kein Messskript,
> kein Dev-Server, kein Login, kein E2E-Test. Nachweis nur über `grep`, `npx tsc --noEmit`,
> `npm run build`. Die Sichtprüfung macht Belal. Nach jedem Teil anhalten.

### Warum

Heute kennt das Prüf-Banner nur **Annehmen** und **Ablehnen**. Der Normalfall in einem Betrieb ist
aber ein dritter: der Handwerker hat die Sache richtig gemacht und falsch eingetragen. Im echten
Fall lautete der Titel „Alle aufgelistete Pauschaöpositionen exakt 3 mal ausgeführt" bei
plausiblen 10 Std × 75,50 €. Ablehnen heißt: er trägt neu ein. Das macht er einmal, danach ruft
er an — und die Regie steht im Telefon statt im System.

Zweiter Befund, kaufmännisch: `auftrag-positionen-rechnung.ts` rechnet die Kundenrechnung mit
`menge × stundensatz`, und `stundensatz` ist der Satz, den **der Handwerker** eingetippt hat.
Regiestunden gehen also eins zu eins durch, Bärenwald verdient daran nichts. Bei allen anderen
Positionen gibt es einen Partner- und einen Kundenpreis, bei Regie nicht.

**Entscheidung von Belal, gilt ohne Ausnahme:** zwei Sätze. Der Handwerker trägt seinen Satz ein,
Bärenwald setzt den Kundensatz, vorbelegt aus dem Aufschlag und überschreibbar.

---

### Teil 1 — Migration: Kundensatz als eigene Spalte

1. Neue Migration mit **heutigem** Zeitstempel. Niemals eine bestehende Migrationsdatei ändern —
   genau das hat im September die Vorgangsliste lahmgelegt, weil `db push` eine bereits
   angewendete Version nie erneut einspielt.
2. `auftrag_positionen` bekommt `stundensatz_kunde numeric null`. Kein Default, kein Backfill:
   leer bedeutet „noch nicht gesetzt", und Punkt 8 regelt, was dann gilt.
3. Kommentar auf der Spalte, der die Bedeutung festhält: Kundensatz je Stunde;
   `stundensatz` bleibt der Partnersatz.
4. **Typdatei von Hand ergänzen — als bewusster Zwischenstand.** Ein Neuerzeugen von
   `src/types/supabase.ts` ist derzeit nicht möglich (kein Zugangstoken). Ohne den Eintrag kennt
   TypeScript die Spalte nicht und B kompiliert nicht.

   Trage `stundensatz_kunde: number | null` in `src/types/supabase.ts` bei
   `auftrag_positionen` in **Row**, **Insert** und **Update** ein, mit einer Kommentarzeile
   direkt darüber:

   ```ts
   // HAND ERGÄNZT 2026-09-26 (Migration stundensatz_kunde) — beim nächsten
   // `supabase gen types` entfällt diese Zeile. Nicht als Vorbild nehmen.
   ```

   Das ist ausdrücklich ein Notbehelf, kein Muster: die Datei ist generiert, und jede weitere
   Handänderung daran ist zu unterlassen. Im Bericht vermerken, damit es beim nächsten
   Neuerzeugen nicht überrascht.
5. Der Spalten-Guard bleibt rot — das ist bekannt und **nicht** Teil dieses Auftrags. Nicht
   nebenbei beheben, keine Grundlinie anlegen.

**Anhalten.** Commit: `feat(crm): auftrag_positionen.stundensatz_kunde`

---

### Teil 2 — Der Bearbeiten-Schritt

Ort: `src/components/auftraege/AuftragPartnerPositionsPruefungPanel.tsx` (Banner) und die
Aktionen in `src/app/(dashboard)/auftraege/partner-positions-anfrage-actions.ts`
(`decideWeitereArbeitMitNotify`, `decidePartnerPositionsAnfrageIntern`).

5. Dritte Aktion **Bearbeiten** neben Annehmen und Ablehnen. Sie öffnet die Position in einem
   `EditorSheet` — keine neue Oberfläche bauen, das ist die Kanon-Fläche für Bearbeiten.
6. Bearbeitbar sind: **Titel**, **Beschreibung**, **Stunden**, **Partnersatz**, **Kundensatz**.
   Beide Beträge rechnen live mit und stehen gleichzeitig sichtbar nebeneinander:
   „Partner: 10 Std × 75,50 € = 755,00 €" und „Kunde: 10 Std × <Kundensatz> = <Betrag>".
   Der Nutzer soll beim Tippen sehen, was er dem Kunden berechnet und was er zahlt.
7. **Begründung ist Pflichtfeld**, sobald sich Stunden, einer der Sätze oder der Titel ändern.
   Reine Tippfehlerkorrekturen in der Beschreibung ohne Begründung sind erlaubt.
8. Vorbelegung des Kundensatzes: aus eurem bestehenden Aufschlag berechnen, falls es dafür eine
   Quelle im System gibt — sonst mit dem Partnersatz vorbelegen und im Feld sichtbar machen, dass
   noch kein Aufschlag hinterlegt ist. **Keinen Aufschlagswert erfinden.** Wenn du keine Quelle
   findest, im Bericht sagen und die Entscheidung Belal überlassen.
9. Speichern schreibt nur die Position. Der Anerkennungsstatus bleibt unverändert — Bearbeiten ist
   **nicht** Annehmen. Der Nutzer entscheidet danach getrennt.
10. Jede Korrektur wird festgehalten: was war vorher, was ist jetzt, wer, wann, warum. Nutze dafür
    die vorhandene Verlaufs-/Audit-Struktur des Auftrags, lege keine zweite an. Diese Daten
    braucht Paket C für die Mail an den Handwerker.

**Anhalten.** Commit: `feat(crm): Regie-Position vor der Entscheidung bearbeiten`

---

### Teil 3 — Rechnung rechnet mit dem Kundensatz

11. In `src/lib/auftraege/auftrag-positionen-rechnung.ts` (Zeilen ~34–56) die Regie-Berechnung auf
    `stundensatz_kunde` umstellen. Fällt der leer aus, gilt `stundensatz` wie bisher — damit ändert
    sich an Altdaten nichts.
12. Die Partnerseite bleibt unangetastet: `load-bericht-datenquelle.ts` und alles, was den
    Partnerbericht oder die Partnerabrechnung speist, rechnet weiter mit `stundensatz`.
13. Suche alle Stellen, die heute `stundensatz` lesen
    (`grep -rn "stundensatz" src/ --include=*.ts --include=*.tsx`), und ordne jede einer Seite zu:
    Kundenseite → `stundensatz_kunde` mit Rückfall, Partnerseite → `stundensatz`. Die Zuordnung
    kommt als Tabelle in den Bericht. **Keine Stelle ungeprüft lassen** — eine verwechselte Seite
    heißt, dass der Handwerker den Kundenpreis sieht oder der Kunde den Einkaufspreis.

**Anhalten.** Commit: `fix(crm): Kundenrechnung rechnet Regie mit dem Kundensatz`

---

### Teil 4 — Anzeige im CRM

14. Überall, wo eine Regieposition im CRM dargestellt wird, stehen beide Sätze — nicht nur einer.
    Wer im CRM arbeitet, muss die Marge sehen können, ohne rechnen zu müssen.
15. Eine korrigierte Position ist als korrigiert erkennbar (kleiner Hinweis an der Position, mit
    der Begründung als Tooltip oder Zeile). Kein neues Abzeichen erfinden — `MockBadge` bzw.
    `StatusBadge` nutzen.

**Anhalten.** Commit: `feat(crm): Regie zeigt Partner- und Kundensatz`

---

### Abnahme

- `grep -rn "stundensatz" src/` — jede Fundstelle ist in der Berichtstabelle einer Seite zugeordnet
- Kein neuer Angebots- oder Positionsstatus
- Keine neue Bearbeiten-Oberfläche außerhalb von `EditorSheet`
- `npx tsc --noEmit` grün
- `npm run build` bleibt am Spalten-Guard rot — bekannt, nicht Teil dieses Auftrags

### Bericht

Die Zuordnungstabelle aus Punkt 13, die Entscheidung zum Aufschlag aus Punkt 8, und wo der
Korrekturverlauf aus Punkt 10 gespeichert wird — Paket C liest ihn.

**Nicht in diesem Auftrag:** die Mails (Paket C), die Summen und die Sichtbarkeit in den Portalen
(Paket D), die Anzeige der Sätze im Handwerker- und Kundenportal (Paket B-Portal).
