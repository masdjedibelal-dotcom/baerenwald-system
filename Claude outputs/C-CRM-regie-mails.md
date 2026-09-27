# Paket C · CRM — Mails an Handwerker und Kunde

Repo: **baerenwald-system**. Eigener Branch. Drei Commits, nach jedem anhalten.
Voraussetzung: **B-CRM ist durch** (Korrekturverlauf und beide Sätze existieren).

**Portal:** für dieses Paket ist am Portal **nichts** zu tun. Der Mailversand liegt vollständig im
CRM. Die Anzeige beim Kunden im Portal ist Paket D-Portal.

---

## Auftrag C-CRM: Annehmen informiert beide Seiten — automatisch

> **Grundregel: keine Prüfung im Browser.** Keine Screenshots, kein Playwright, kein Dev-Server,
> kein Login, kein E2E-Test, kein Testversand an echte Adressen.
> Nachweis nur über `grep`, `npx tsc --noEmit`, `npm run build`. Nach jedem Teil anhalten.

### Warum

Heute passiert bei der Annahme einer Regieposition **keine** Mail — weder an den Handwerker noch
an den Kunden. Auch im funktionierenden Fall nicht: der Kunde erfährt von Mehrkosten frühestens
über ein manuell versendetes Angebot, meist erst über die Rechnung. Das ist der Punkt, an dem aus
einer sauberen Nacharbeit eine Diskussion wird.

**Entscheidung von Belal:** der Kunde wird **informiert**, nicht gefragt. Keine Freigabe, kein
Zustimmungsknopf. Die Mail informiert, und der Portal-Eintrag ist der Nachweis, wann sie kam.

---

### Teil 1 — Mail an den Handwerker

Bestehendes Muster nutzen: eine Datei `src/lib/mail/regie-entscheidung-partner-mail.ts` im Stil
der vorhandenen `*-mail.ts`, mit `mailHtmlBase`, `buildSubject`, `mailSummaryBlock` aus
`src/lib/mail-templates.ts`. Kein eigenes HTML-Gerüst.

1. **Drei Fälle, drei Betreffzeilen:**
   | Fall | Inhalt |
   |---|---|
   | angenommen, unverändert | Titel, Stunden, **Partnersatz**, Betrag, Auftrag |
   | angenommen mit Änderung | zusätzlich alt gegen neu je geändertem Feld, plus Begründung |
   | abgelehnt | Titel und Grund |
2. Der Änderungsfall liest den Korrekturverlauf aus B-CRM, Punkt 10 — nicht neu berechnen und
   nicht aus dem Formular durchreichen. Was in der Mail steht, muss dem entsprechen, was
   gespeichert wurde.
3. **Nur der Partnersatz.** Kundensatz, Kundenbetrag und Marge kommen in dieser Mail nirgends vor —
   auch nicht in einer Summenzeile, auch nicht im Betreff.
4. Anrede über `mailAnredeFromKundeTyp` / `mailBegruessungZeile`, damit die Ansprache zum Partner
   passt wie in den übrigen Partnermails.

**Anhalten.** Commit: `feat(crm): Mail an Partner bei Regie-Entscheidung`

---

### Teil 2 — Mail an den Kunden

Neue Datei `src/lib/mail/regie-information-kunden-mail.ts`, Muster wie
`bautagebuch-kunden-mail.ts` (`mailKundenStandardOptions`, `mailKundenGruss`,
`mailKundenContactLine`, `mailKundenPortalTop`).

5. Inhalt: was gemacht wurde (Titel und Beschreibung **nach** der Korrektur), Stunden,
   **Kundensatz**, Betrag dieser Position, und die **neue Gesamtsumme** des Vorgangs. Dazu das
   Datum und der Link ins Portal.
6. **Ton: informierend, nicht fragend.** Kein „bitte freigeben", kein Zustimmungsknopf, keine
   Frist. Sonst wartet der Handwerker auf etwas, das nie kommt. Formulierung mit `src/lib/copy`
   abstimmen, damit sie zum übrigen Wording passt.
7. **Ein Widerspruchsweg ohne Freigabe:** eine Zeile „Fragen zu dieser Position?" mit Antwort an
   euch. Das hält den Kunden vom Telefon fern, ohne den Ablauf zu blockieren.
8. Partnersatz, Partnerbetrag, Marge und der Name des Handwerkers als Preisquelle kommen in dieser
   Mail nicht vor. Ob der ausführende Betrieb genannt wird, entscheidet die bestehende Regel für
   Kundenmails — nicht neu erfinden.
9. Bei einer **Ablehnung** geht **keine** Kundenmail. Es ist nichts passiert.

**Anhalten.** Commit: `feat(crm): Informationsmail an Kunden bei angenommener Regie`

---

### Teil 3 — Auslösung, unteilbar und ohne Doppelversand

10. Beide Mails werden in `decideWeitereArbeitMitNotify` bzw.
    `decidePartnerPositionsAnfrageIntern` ausgelöst — an **einer** Stelle, nicht in der Oberfläche.
11. **Reihenfolge:** erst alle Datenschreibvorgänge (Position anerkannt, in Auftrag und Angebot
    übernommen), dann die Mails. Scheitert das Schreiben, geht keine Mail raus. Das ist die
    Lehre aus Auftrag A Teil 3: eine Mail über etwas, das nicht gespeichert wurde, ist schlimmer
    als keine Mail.
12. **Doppelversand verhindern** nach dem Muster, das für die Mahnung schon funktioniert
    (`claimMahnungStufe` in `src/app/actions/mails.ts`): ein bedingtes `update` mit
    `.is(<spalte>, null)` und Prüfung der zurückgegebenen Zeilenzahl, **bevor** gesendet wird.
    Dafür braucht die Position zwei Zeitstempel — Migration mit heutigem Zeitstempel, danach
    Typen neu erzeugen:
    `regie_mail_partner_at` und `regie_mail_kunde_at`, beide `timestamptz null`.
13. Scheitert eine Mail nach dem Claim, wird das protokolliert **und** die Aktion meldet es
    sichtbar zurück. Nicht wie heute nur in ein Protokoll, das niemand liest — solange keine
    Sentry-DSN gesetzt ist, ist ein `console.error` gleichbedeutend mit „nie passiert".
14. Nutzt bereits eine Stelle `sendMail` mit einem Typ, ergänze die neuen Typen dort sauber, damit
    die Mails im `email_log` auftauchen und im Vorgang sichtbar sind.

**Anhalten.** Commit: `feat(crm): Regie-Mails auslösen, Doppelversand ausgeschlossen`

---

### Abnahme

- Beide Mailvorlagen nutzen `mailHtmlBase` und `buildSubject`; kein eigenes HTML-Gerüst
- Im Partner-Mailtext kommt weder `stundensatz_kunde` noch ein Kundenbetrag vor (per `grep` belegen)
- Im Kunden-Mailtext kommt weder `preis_partner` noch `stundensatz` vor (per `grep` belegen)
- Zweimaliges Auslösen derselben Entscheidung sendet nachweislich nur einmal — über die
  Claim-Spalten, nicht über eine Prüfung im Speicher
- Keine Mail, wenn ein Schreibvorgang gescheitert ist
- `npx tsc --noEmit` und `npm run build` grün

### Bericht

Die drei Partner-Betreffzeilen, der Kunden-Betreff, wo die Auslösung sitzt, die beiden neuen
Spalten, und wie Punkt 13 gelöst wurde.

**Nicht in diesem Auftrag:** die Anzeige der Regie im Kundenportal und die Gesamtsummen —
Paket D.
