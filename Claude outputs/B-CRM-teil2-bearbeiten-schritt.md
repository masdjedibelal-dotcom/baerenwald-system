# Paket B · CRM · Teil 2 — Der Bearbeiten-Schritt

Repo: **baerenwald-system**. Eigener Branch, ein Commit. Teil 1 ist erledigt.
Voraussetzung: die Migration `stundensatz_kunde` ist auf Staging eingespielt.

---

## Teil 2: Prüfen und korrigieren, bevor entschieden wird

> **Grundregel: keine Prüfung im Browser.** Keine Screenshots, kein Playwright, kein Messskript,
> kein Dev-Server, kein Login, kein E2E-Test. Nachweis nur über `grep`, `npx tsc --noEmit`.
> `npm run build` bleibt am Spalten-Guard rot — bekannt, **nicht** Teil dieses Auftrags.
> Die Sichtprüfung macht Belal. Am Ende anhalten.

### Worum es geht

Das Prüf-Banner kennt heute nur **Annehmen** und **Ablehnen**. Der häufigste Fall in der Praxis
ist aber der dritte: die Sache stimmt, die Eingabe nicht. Im echten Vorgang lautete der Titel
„Alle aufgelistete Pauschaöpositionen exakt 3 mal ausgeführt" bei plausiblen 10 Std × 75,50 €.
Ablehnen hieße: der Handwerker trägt alles neu ein. Das macht er einmal, danach ruft er an.

### Orte

- Banner: `src/components/auftraege/AuftragPartnerPositionsPruefungPanel.tsx`
- zweite Aufrufstelle: `src/components/auftraege/AuftragDetailsTab.tsx`
- Aktionen: `src/app/(dashboard)/auftraege/partner-positions-anfrage-actions.ts`
- Bearbeiten-Fläche: `EditorSheet` aus `src/components/surfaces/` — **die** Kanon-Fläche fürs
  Bearbeiten. Keine neue Oberfläche, kein eigenes Modal.

### Aufgabe

1. **Dritte Aktion „Bearbeiten"** neben Annehmen und Ablehnen, an beiden Aufrufstellen. Sie öffnet
   die Position in einem `EditorSheet` mit `context="detail"`.

2. **Bearbeitbare Felder:** Titel, Beschreibung, Stunden, Partnersatz (`stundensatz`),
   Kundensatz (`stundensatz_kunde`).

3. **Beide Beträge stehen gleichzeitig sichtbar** und rechnen beim Tippen mit:
   ```
   Partner   10,0 Std × 75,50 €   =   755,00 €
   Kunde     10,0 Std × <Satz>    =   <Betrag>
   ```
   Der Nutzer soll ohne Kopfrechnen sehen, was er zahlt und was er berechnet. Formatierung über
   `src/lib/format/geld-datum` — keine eigene Zahlenformatierung.

4. **Kundensatz vorbelegen:** Suche im Code nach einer vorhandenen Aufschlags- oder
   Margenregel (`grep -rn "aufschlag\|marge\|faktor\|vk_faktor" src/lib/`). Findest du eine,
   nutze sie. Findest du **keine**, belege mit dem Partnersatz vor und setze im Feld einen
   Hinweis „kein Aufschlag hinterlegt".
   **Erfinde keinen Wert und keinen Prozentsatz.** Was du gefunden oder nicht gefunden hast,
   kommt in den Bericht — die Entscheidung trifft Belal.

5. **Begründung ist Pflichtfeld**, sobald sich Titel, Stunden, Partnersatz oder Kundensatz
   ändern. Eine reine Korrektur der Beschreibung darf ohne Begründung gespeichert werden.
   Die Prüfung läuft gegen die geladenen Ausgangswerte, nicht gegen „wurde das Feld angefasst".

6. **Speichern ändert den Anerkennungsstatus nicht.** Bearbeiten ist nicht Annehmen. Nach dem
   Speichern steht die Position weiterhin in Prüfung, und der Nutzer entscheidet getrennt.
   Das Banner zeigt danach die korrigierten Werte.

7. **Korrekturverlauf über die vorhandene Struktur.** `writeAuditEvent` aus
   `src/lib/audit/write-audit-event.ts` wird im Regie-Pfad bereits dreimal benutzt — dorthin,
   keine zweite Struktur anlegen. Ein Eintrag je Speicherung:
   - `entityType: 'auftrag_position'`, `entityId` = Positions-Id
   - `aktion: 'regie_korrigiert'`
   - `payload`: je geändertem Feld `{ feld: { alt, neu } }`, dazu die Begründung
   Paket C liest genau diesen Eintrag für die Mail an den Handwerker — das Format also so
   wählen, dass man alt und neu je Feld direkt herauslesen kann.

8. **Schreibfehler brechen ab.** Dieselbe Regel wie in Auftrag A Teil 3: schlägt das Speichern
   fehl, wird protokolliert **und** abgebrochen, mit einem verständlichen Satz aus
   `src/lib/copy/errors`. Keine Erfolgsmeldung auf einen fehlgeschlagenen Schreibvorgang.

9. **Reihenfolge beim Speichern:** erst die Position, dann der Audit-Eintrag. Scheitert die
   Position, gibt es keinen Verlaufseintrag über eine Änderung, die nicht stattgefunden hat.

10. Zahlenfelder: Stunden mit einer Nachkommastelle, Sätze mit zwei. Negative Werte und Null
    ablehnen, mit Feldfehler statt Toast. Keine stillen Rundungen beim Speichern — was angezeigt
    wird, wird gespeichert.

### Abnahme

- Keine neue Bearbeiten-Oberfläche außerhalb von `EditorSheet`
- Kein neuer Positions- oder Anerkennungsstatus
- Kein zweiter Verlaufsspeicher neben `audit_events`
- Speichern ohne Begründung ist bei geänderten Beträgen nicht möglich
- Nach dem Speichern steht die Position weiterhin in Prüfung (per `grep` im Code belegen: der
  Speicherpfad fasst `anerkennung_status` nicht an)
- `npx tsc --noEmit` grün

### Bericht

Was Punkt 4 zum Aufschlag ergeben hat (gefunden oder nicht), das genaue `payload`-Format aus
Punkt 7 — Paket C baut darauf auf — und an welchen beiden Stellen die Aktion eingehängt wurde.

Commit: `feat(crm): Regie-Position vor der Entscheidung bearbeiten`

**Danach:** Teil 3 (Rechnung rechnet mit dem Kundensatz) und Teil 4 (Anzeige beider Sätze im CRM).
