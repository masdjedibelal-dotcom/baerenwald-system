# Cursor-Auftrag A, Teil 3 + 4 — Regie-Fundament abschließen

Kopiere alles ab der Trennlinie in Cursor. Teil 1 und 2 sind erledigt.
Drei Commits: Teil 3, Teil 4, Portal-Nachzug. Nach jedem Teil anhalten.

---

## Teil 3 + 4: verschluckte Schreibfehler, falsche Sperre, Portal-Nachzug

> **Grundregel: keine Prüfung im Browser.** Keine Screenshots, kein Playwright, kein Messskript,
> kein Dev-Server, kein Login, kein E2E-Test, keine Datenbankverbindung.
> Nachweis nur über `grep` auf dem Quelltext, `npx tsc --noEmit`, `npm run build`.
> **Die Sichtprüfung macht Belal.** Nach jedem Teil anhalten.

---

### Teil 3 — Schreibfehler nicht mehr verschlucken (nur Regie-Pfad)

In `src/app/(dashboard)/auftraege/partner-positions-anfrage-actions.ts` stehen **20**
`logDbError`-Aufrufe, davon **15 ohne Abbruch danach**. Das ist die Ursache dafür, dass die
Oberfläche „Angenommen" meldete, während in Wahrheit nichts geschrieben wurde.

**Umfang: ausschließlich diese Datei.** Die rund 474 gleichartigen Stellen im restlichen CRM sind
ein eigener Auftrag. Nicht mit anfassen.

1. Jeden der 15 Aufrufe einzeln durchgehen und einer von zwei Klassen zuordnen:
   - **tragend** — ohne diesen Schreibvorgang ist das Ergebnis der Aktion falsch.
     → protokollieren **und** abbrechen, mit Rückmeldung an die Oberfläche.
   - **begleitend** — Protokollzeile, Zeitstempel, Benachrichtigung; das Ergebnis bleibt ohne sie
     richtig. → darf weiterlaufen, bekommt aber einen Kommentar in einer Zeile, **warum** ein
     Fehlschlag hier folgenlos ist.
   Im Bericht beide Listen zeigen. Keine Stelle bleibt unbewertet.
2. Die Rückmeldung an die Oberfläche ist ein verständlicher Satz aus `src/lib/copy/errors` — kein
   Postgres-Text, kein Spaltenname, keine Funktionsnamen. Wenn kein passender Schlüssel existiert,
   einen neuen im Stil der vorhandenen anlegen.
3. Bei einem Abbruch darf die Oberfläche **nicht** „Angenommen" melden. Prüfe die aufrufende
   Komponente daraufhin mit.
4. Die Annahme muss unteilbar sein: entweder ist die Position anerkannt **und** in Auftrag und
   Angebot übernommen, oder nichts davon. Wenn die Struktur keine Transaktion hergibt, den Ablauf
   so ordnen, dass der Statuswechsel auf `anerkannt` **zuletzt** kommt — dann bleibt bei einem
   Abbruch der prüfbare Ausgangszustand erhalten statt eines halb angenommenen. Im Bericht sagen,
   welcher Weg gewählt wurde.

**Anhalten.** Commit: `fix(crm): Regie-Annahme bricht bei DB-Fehler ab statt still weiterzulaufen`

---

### Teil 4 — „Auftrag bearbeiten" fragt das falsche Dokument

Heute, `src/lib/angebote/angebot-wizard-types.ts:472`:

```ts
export function angebotDarfFuerAuftragKorrektur(status: string): boolean {
  const st = String(status ?? '').toLowerCase()
  return st === 'kunde_akzeptiert' || st === 'angenommen' || st === 'beauftragt'
}
```

Drei nachgeprüfte Befunde:
- `beauftragt` steht **nicht** in `ANGEBOT_WRITE_STATUSES` — kein Codepfad kann diesen Wert je
  setzen. Toter Ast.
- `angenommen` steht gleichzeitig in `PARTNER_ANNAHME_STATUSES` und bedeutet damit je nach Herkunft
  Kundenannahme **oder** Handwerkerannahme. Die Sperre liest ihn als Kundenannahme.
- Beim Direktauftrag bleibt das Angebot auf `handwerker_akzeptiert`. Dieser Weg kann die Bedingung
  **nie** erfüllen — keine Wartesituation, sondern eine Sackgasse.

Die Funktion heißt „Auftrag bearbeiten", befragt aber das Angebot. Bearbeitet wird der Auftrag.

5. Bedingung auf den **Auftrag** umstellen: bearbeitbar, wenn zum Lead ein Auftrag existiert
   (`auftraege.angebot_id` bzw. `auftraege.lead_id`) **und** zu diesem Auftrag keine gestellte
   Rechnung vorliegt.
6. „Gestellt" heißt: Rechnungsstatus in `gesendet`, `bezahlt`, `ueberfaellig`, `ueberwiesen`,
   `korrektur_versendet`. **Nicht** gestellt sind `entwurf`, `korrektur_entwurf`,
   `korrektur_gespeichert`, `ausstehend`, `storniert`. Diese Zuordnung als benannte Konstante
   neben `RECHNUNG_WRITE_STATUSES` ablegen, nicht als Aufzählung im Code verstreuen.
7. Ergebnis, das erreicht sein muss:
   | Fall | erwartet |
   |---|---|
   | Normalweg, Kunde hat angenommen, Auftrag da | bearbeitbar |
   | Angebot beim Kunden, noch keine Entscheidung, **kein** Auftrag | gesperrt |
   | Direktauftrag | bearbeitbar |
   | Rechnung gestellt | gesperrt, Hinweis auf den Korrekturweg über die Rechnung |
8. **Kein neuer Angebotsstatus.** Die Statusliste ist bereits überladen, siehe `angenommen`.
9. `beauftragt` aus der Erlaubnisliste entfernen oder die Funktion vollständig ersetzen, je
   nachdem was nach Punkt 5 übrig bleibt. Kein toter Ast bleibt stehen.
10. Die Sperrmeldung neu formulieren, Text aus `src/lib/copy/errors`. Sie muss sagen, **warum**
    gesperrt ist und was stattdessen geht. „Korrektur nur nach Annahme — Angebot muss angenommen
    sein" war im echten Fall schlicht falsch und hat eine Stunde Fehlersuche gekostet.
11. Alle Aufrufstellen mitziehen:
    `grep -rn "angebotDarfFuerAuftragKorrektur\|forAuftragKorrektur\|angebotWizardBearbeitenSperrgrund" src/`

**Anhalten.** Commit: `fix(crm): Auftrag-Korrektur prüft den Auftrag statt des Angebots`

---

### Teil 5 — Portal-Nachzug: `preis_kunde` ist dort noch drin

Teil 1 hat nur das CRM repariert. Im Portal-Repo (`baerenwald`) steht `preis_kunde` noch in
**2 Dateien**.

12. Dieselbe Umstellung wie im CRM: `preis_kunde` → `preis_fix` (Kundenpreis der
    Auftragsposition). Danach `grep -rn "preis_kunde" src/` → 0.
13. Prüfen, ob an diesen Stellen fachlich der Kundenpreis gemeint ist oder `preis_partner`. Das
    Portal zeigt je nach Ansicht beide Seiten — im Handwerkerportal ist der Partnerpreis richtig,
    im Kundenportal der Kundenpreis. Je Stelle im Bericht begründen, welche der beiden es ist.
14. Danach den Spalten-Guard im Portal erneut laufen lassen und die Zahl der Verstöße vorher /
    nachher im Bericht nennen.

**Anhalten.** Commit: `fix(portal): preis_kunde existiert nicht — auf die richtige Preisspalte`

---

### Abnahme über alle drei Teile

- In `partner-positions-anfrage-actions.ts` ist jeder `logDbError` entweder mit Abbruch versehen
  oder mit einer Begründung kommentiert. Keine Stelle ohne beides.
- `grep -rn "preis_kunde" src/` → 0 in **beiden** Repos.
- `angebotDarfFuerAuftragKorrektur` fragt keinen Angebotsstatus mehr ab, oder existiert nicht mehr.
- `beauftragt` kommt in keiner Erlaubnisliste mehr vor.
- `npx tsc --noEmit` und `npm run build` grün in beiden Repos.

### Bericht

In den Commit-Text und nach `docs/TODO-ENTWICKLUNG.md`: die beiden Listen aus Punkt 1
(tragend / begleitend), der gewählte Weg aus Punkt 4, die vier Fälle aus Punkt 7 mit dem
tatsächlichen Ergebnis, und die Begründung je Portal-Stelle aus Punkt 13.

**Nicht in diesem Auftrag:** der Bearbeiten-Schritt für Regie mit den zwei Stundensätzen, die
Mails an Handwerker und Kunde, die Summen in den Portalen. Das sind die Pakete B, C und D.
