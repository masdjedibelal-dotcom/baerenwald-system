# FIX 2 · CRM — Regie-Mails: Kundenmail bauen, beide auslösen

Repo: **baerenwald-system**. Eigener Branch. Zwei Commits, nach jedem anhalten.

> **Keine Prüfung im Browser.** Kein Screenshot, kein Playwright, kein Dev-Server, kein Login,
> kein Testversand an echte Adressen. Nachweis nur über `grep`, `npx tsc --noEmit`.

## Befund

`src/lib/mail/regie-entscheidung-partner-mail.ts` existiert — und hat **null Aufrufer**. Sie
liegt tot im Repo. Eine Kundenmail gibt es gar nicht. Beim Annehmen einer Regieposition geht
heute also keine einzige Nachricht raus: der Handwerker erfährt nichts von deiner Entscheidung,
der Kunde nichts von den Mehrkosten.

**Entscheidung von Belal:** der Kunde wird **informiert**, nicht gefragt. Keine Freigabe, kein
Zustimmungsknopf.

---

### Teil 1 — Kundenmail

Neue Datei `src/lib/mail/regie-information-kunden-mail.ts`, Muster wie
`bautagebuch-kunden-mail.ts`: `mailHtmlBase`, `buildSubject`, `mailKundenStandardOptions`,
`mailKundenGruss`, `mailKundenContactLine`, `mailKundenPortalTop`. Kein eigenes HTML-Gerüst.

1. Inhalt: was gemacht wurde (Titel und Beschreibung **nach** einer etwaigen Korrektur), Stunden,
   **Kundensatz**, Betrag dieser Position, neue Gesamtsumme des Vorgangs, Datum, Portal-Link.
2. **Ton: informierend, nicht fragend.** Kein „bitte freigeben", kein Zustimmungsknopf, keine
   Frist — sonst wartet der Handwerker auf etwas, das nie kommt.
3. Eine Zeile „Fragen zu dieser Position?" mit Antwort an euch. Das ist der Widerspruchsweg ohne
   Freigabe.
4. Partnersatz, Partnerbetrag, Marge und die Korrekturbegründung kommen **nicht** vor. Die
   Begründung erklärt dem Handwerker eine Kürzung und geht den Kunden nichts an.
5. Bei einer **Ablehnung** geht keine Kundenmail — es ist nichts passiert.

**Anhalten.** Commit: `feat(crm): Informationsmail an Kunden bei angenommener Regie`

---

### Teil 2 — Auslösung, unteilbar und ohne Doppelversand

6. Beide Mails werden in `decideWeitereArbeitMitNotify` bzw.
   `decidePartnerPositionsAnfrageIntern` ausgelöst — an **einer** Stelle, nicht in der
   Oberfläche. Die tote Partner-Mail aus Teil 1 wird hier angeschlossen.
7. **Reihenfolge:** erst alle Datenschreibvorgänge, dann die Mails. Scheitert das Schreiben, geht
   keine Mail raus. Eine Mail über etwas, das nicht gespeichert wurde, ist schlimmer als keine.
8. **Doppelversand verhindern** nach dem Muster, das für die Mahnung schon funktioniert
   (`claimMahnungStufe` in `src/app/actions/mails.ts`): bedingtes `update` mit
   `.is(<spalte>, null)` und Prüfung der zurückgegebenen Zeilenzahl **vor** dem Senden.
   Dafür zwei Zeitstempel auf der Position — neue Migration mit **heutigem** Zeitstempel, danach
   die Typdatei von Hand ergänzen wie bei `stundensatz_kunde`:
   `regie_mail_partner_at` und `regie_mail_kunde_at`, beide `timestamptz null`.
9. Die Partner-Mail liest den Korrekturverlauf aus `audit_events`, Aktion `regie_korrigiert`,
   Format `{ feld: { alt, neu } }` plus Begründung. Nicht neu berechnen, nicht aus dem Formular
   durchreichen — was in der Mail steht, muss dem entsprechen, was gespeichert wurde.
10. Scheitert eine Mail nach dem Claim, wird protokolliert **und** sichtbar zurückgemeldet.
    Solange keine Sentry-DSN gesetzt ist, ist ein `console.error` gleichbedeutend mit
    „nie passiert".
11. Beide Mails über `sendMail` mit eigenem Typ, damit sie im `email_log` auftauchen.

**Anhalten.** Commit: `feat(crm): Regie-Mails auslösen, Doppelversand ausgeschlossen`

---

## Abnahme

- Im Partner-Mailtext kein `stundensatz_kunde` und kein Kundenbetrag (per `grep` belegen)
- Im Kunden-Mailtext kein `preis_partner`, kein `stundensatz`, keine Begründung (per `grep`)
- Zweimaliges Auslösen derselben Entscheidung sendet nachweislich nur einmal — über die
  Claim-Spalten, nicht über eine Prüfung im Speicher
- Keine Mail, wenn ein Schreibvorgang gescheitert ist
- `grep -rn "regie-entscheidung-partner-mail" src/` → Aufrufer vorhanden
- `npx tsc --noEmit` grün

## Bericht

Der Kunden-Betreff, wo die Auslösung sitzt, die beiden neuen Spalten, und wie Punkt 10 gelöst
wurde.
