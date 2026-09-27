# Auftrag A · Teil 4 — CRM: „Auftrag bearbeiten" fragt das falsche Dokument

Repo: **baerenwald-system**. Eigener Branch, ein Commit. Teile 1–3 sind erledigt.
Am Portal ist für diesen Teil **nichts** zu tun.

---

## Teil 4: Die Sperre prüft den Auftrag statt das Angebot

> **Grundregel: keine Prüfung im Browser.** Keine Screenshots, kein Playwright, kein Messskript,
> kein Dev-Server, kein Login, kein E2E-Test. Nachweis nur über `grep`, `npx tsc --noEmit`,
> `npm run build`. Die Sichtprüfung macht Belal. Am Ende anhalten.

### Befund

`src/lib/angebote/angebot-wizard-types.ts:472`:

```ts
export function angebotDarfFuerAuftragKorrektur(status: string): boolean {
  const st = String(status ?? '').toLowerCase()
  return st === 'kunde_akzeptiert' || st === 'angenommen' || st === 'beauftragt'
}
```

Drei nachgeprüfte Probleme:

1. **`beauftragt` kann niemand schreiben.** Der Wert steht nicht in `ANGEBOT_WRITE_STATUSES`
   (`src/lib/status/write-angebot-status.ts:13`). Kein Codepfad kann ihn je setzen. Toter Ast.
2. **`angenommen` hat zwei Bedeutungen.** Der Wert steht gleichzeitig in
   `PARTNER_ANNAHME_STATUSES` und meint dort die Handwerkerannahme. Die Sperre liest ihn als
   Kundenannahme. Ein Wert, zwei Bedeutungen — das schlägt irgendwann zufällig zu.
3. **Der Direktauftrag kann die Bedingung nie erfüllen.** Dort bleibt das Angebot auf
   `handwerker_akzeptiert`, weil der Weg die Kundenannahme bewusst überspringt. Das ist keine
   Wartesituation, sondern eine Sackgasse — im echten Fall (HV Gutmann) war „Auftrag bearbeiten"
   dauerhaft gesperrt, mit der irreführenden Meldung „Korrektur nur nach Annahme".

Die Funktion heißt „Auftrag bearbeiten", befragt aber das Angebot. **Bearbeitet wird der Auftrag.**

### Aufgabe

4. Bedingung auf den **Auftrag** umstellen: bearbeitbar, wenn zum Vorgang ein Auftrag existiert
   (`auftraege.angebot_id` bzw. `auftraege.lead_id`) **und** zu diesem Auftrag keine gestellte
   Rechnung vorliegt.

5. „Gestellt" heißt: Rechnungsstatus in `gesendet`, `bezahlt`, `ueberfaellig`, `ueberwiesen`,
   `korrektur_versendet`.
   **Nicht** gestellt: `entwurf`, `korrektur_entwurf`, `korrektur_gespeichert`, `ausstehend`,
   `storniert`.
   Diese Zuordnung als benannte Konstante neben `RECHNUNG_WRITE_STATUSES` ablegen —
   nicht als Aufzählung im Code verstreuen, sonst steht sie in drei Monaten an vier Stellen
   unterschiedlich da.

6. Ergebnis, das erreicht sein muss:

   | Fall | Angebot | Auftrag | Rechnung | erwartet |
   |---|---|---|---|---|
   | Normalweg, Kunde hat angenommen | `kunde_akzeptiert` | ja | keine | **bearbeitbar** |
   | Angebot beim Kunden, keine Entscheidung | `gesendet_kunde` | nein | keine | **gesperrt** |
   | Direktauftrag | `handwerker_akzeptiert` | ja | keine | **bearbeitbar** |
   | Rechnung gestellt | egal | ja | gestellt | **gesperrt**, Hinweis auf Rechnungsweg |

7. **Kein neuer Angebotsstatus.** Die Statusliste ist bereits überladen — siehe Punkt 2. Wer hier
   einen Wert ergänzt, verschiebt das Problem nur.

8. `beauftragt` aus der Erlaubnisliste entfernen. Bleibt nach Punkt 4 von
   `angebotDarfFuerAuftragKorrektur` nichts Sinnvolles übrig, die Funktion ganz ersetzen statt
   eine leere Hülle stehen zu lassen.

9. Die Sperrmeldung neu formulieren, Text aus `src/lib/copy/errors`. Sie muss sagen, **warum**
   gesperrt ist und was stattdessen geht — im gesperrten Fall aus Zeile 4 der Tabelle also der
   Hinweis, dass die Korrektur über die Rechnung läuft. Die alte Meldung „Korrektur nur nach
   Annahme — Angebot muss angenommen sein" war im echten Fall schlicht falsch.

10. Alle Aufrufstellen mitziehen:
    ```
    grep -rn "angebotDarfFuerAuftragKorrektur\|forAuftragKorrektur\|angebotWizardBearbeitenSperrgrund" src/
    ```
    Betroffen sind mindestens `src/app/(dashboard)/angebote/wizard-actions.ts:538` und
    `src/app/(dashboard)/angebote/actions.ts:664`. Prüfen, ob die Sperre auch die Anzeige des
    CTAs im Detail steuert — ein Knopf, der sichtbar ist und beim Klick eine Fehlermeldung wirft,
    ist schlechter als kein Knopf.

11. Braucht die neue Bedingung Daten, die an der Aufrufstelle noch nicht geladen sind (Auftrag,
    Rechnungsstatus), lade sie dort mit — **nicht** eine zweite Prüfvariante bauen, die woanders
    andere Daten benutzt. Eine Funktion, eine Wahrheit.

### Abnahme

- `grep -rn "'beauftragt'" src/lib/angebote/ src/lib/status/` → kein Vorkommen in einer
  Erlaubnisliste
- `angebotDarfFuerAuftragKorrektur` prüft keinen Angebotsstatus mehr, oder existiert nicht mehr
- Die vier Fälle aus Punkt 6 sind im Bericht einzeln mit dem tatsächlichen Ergebnis aufgeführt
- Die Sperrmeldung kommt aus `src/lib/copy/errors`, nicht als Text im Code
- `npx tsc --noEmit` grün; `npm run build` bleibt am Spalten-Guard aus Teil 2 rot — das ist
  bekannt und **nicht** Teil dieses Auftrags. Nicht „nebenbei" beheben.

### Bericht

In den Commit-Text und nach `docs/TODO-ENTWICKLUNG.md`: die vier Fälle mit Ergebnis, wo die neue
Konstante liegt, die Liste der angepassten Aufrufstellen, und ob der CTA im Detail jetzt
ausgeblendet statt deaktiviert wird.

Commit: `fix(crm): Auftrag-Korrektur prüft den Auftrag statt des Angebots`

**Danach ist Auftrag A abgeschlossen.** Es folgt Paket B-CRM (Bearbeiten-Schritt mit zwei
Stundensätzen).
