# Umbau-Abnahmen

## P01 – Kundenportal vollständig · Branch `umbau/p01-kundenportal` (CRM + Portal)

### Was ist anders

1. Im Kunden- und HV-Portal zeigt ein Auftrag wieder seine **Leistungen**. Die Abfrage scheiterte seit 09.08.2026 bei jedem Aufruf.
2. **„Änderungen annehmen“** im Kundenportal funktioniert wieder. Vorher kam immer „Auftrag konnte nicht geladen werden.“
3. Der **QR-Code** für Melde-Links im HV-Portal wird wieder erzeugt. Er war seit 20.09.2026 kaputt.
4. Die **Suche** im Kunden-, HV- und Partner-Portal liefert wieder Treffer, im HV-Portal auch Dokumente.
5. Kleinere Punkte:
   - Der **Rechnungs-Export** im HV-Portal füllt die Spalten Objekt und Kostenstelle.
   - Der **Datenexport** eines Kontos läuft durch.
   - Die **Bestätigung für Mieter-Meldungen** findet den Kontakt.
   - Nimmt ein Kunde ein Angebot im Portal an, bekommt der Auftrag denselben **Titel** wie bei Annahme im CRM (Gewerke).
6. Mitgenommen aus dem 28.09.:
   - Die **Vorgangsliste** im CRM zieht einen nachträglichen Nachlass ab.
   - **Partner-Dokumente** tragen die echte Firmenadresse statt „Musterstraße 1“.

### So testen Sie (Staging)

1. **Leistungen:** Staging-CRM → Kunden → Musterverwaltung Nord → „Kundenportal öffnen“ → Vorgang „ZZTEST-R2 Elektro WE 12“ → Leistungen: 1 Position sichtbar.
2. **Änderungen annehmen:**
   - Im Staging-CRM denselben Auftrag bearbeiten, eine Position hinzufügen und senden.
   - Im Portal erscheint die Änderung. „Annehmen“ klicken → Bestätigung, kein Fehler.
3. **QR-Code:** Portal von Musterverwaltung Süd → Objekte → Objekt → QR-Code → Bild erscheint, das Handy öffnet den Melde-Link.
   - Falls das Portal meldet, dass Impressum und Datenschutz fehlen: Das ist eine gewollte Sperre, erst dort eintragen.
4. **Suche:**
   - Im HV-Portal oben einen Objektnamen suchen → Objekt erscheint.
   - Einen Dokumentnamen suchen → Dokument erscheint.
5. **Rechnungs-Export:** HV-Portal → Rechnungen → Export → CSV öffnen → Spalte Objekt ist gefüllt, wo die Rechnung einem Objekt zugeordnet ist.

### Was bewusst gleich bleibt

- Aussehen und Abläufe.
- Partner-Portal (Abnahme, Vertrag, Kalkulation) → P02.
- CRM-Spaltenfehler → P03.

### Geprüft von Claude

- **TypeScript Portal:** ohne Fehler.
- **Spalten-Prüfung Portal:** OK, Grundlinie von 23 auf 7 (alle Partner, P02). Das Maximum ist auf 7 gesenkt, behobene Fehler können nicht zurückkommen.
- **Alle 10 geänderten Abfragen:**
  - Auf Staging direkt ausgeführt: alle OK.
  - Auf Prod (nur lesend): alle OK außer den zwei, die die neue Spalte brauchen.
- **QR-Erzeugung** mit der neuen Farbe lokal nachgestellt: PNG wird erzeugt.
- **Staging-Schema** auf Prod-Stand gebracht (3 fehlende Migrationen) und um die neue Spalte ergänzt.

### Für Prod nötig

- Migration `supabase/migrations/20261212120000_auftrag_positionen_kunde_akzeptiert_at.sql`.
  - Sie legt nur eine leere Spalte an und kann nichts überschreiben.
  - Reihenfolge: erst Migration, dann Deploy.

### Rückweg

- Branch nicht mergen: Nichts ändert sich.
- Die Staging-Migration ist harmlos (leere Spalte), sie kann bleiben.

## P02 – Partner-Portal vollständig · Branch `umbau/p02-partnerportal` (Portal)

### Was ist anders

1. Das **Abnahmeprotokoll im Partner-Portal** lädt wieder.
2. Reicht der Partner seine Abnahme ein, stehen seine Leistungen im CRM auf **„erledigt“**. Vorher wurde das stillschweigend nicht gespeichert.
3. Die **Partner-Kalkulation** speichert wieder ins Angebot.
4. **Projektvertrag und Compliance** zeigen den Auftragstitel.
5. Die Gewerk-Zuordnung beim Partner funktioniert.

### So testen Sie (Staging)

1. Staging-CRM → Partner → einen Partner mit Auftrag → „Partnerportal öffnen“ → Auftrag → Abschluss/Abnahme: Das Protokoll lädt ohne Fehler.
2. Abnahme einreichen → im CRM am Auftrag → Leistungen: Die Positionen dieses Partners stehen auf „erledigt“.

### Geprüft

- **Portal-Spaltenprüfung:** 0 Verstöße, Ausnahmeliste leer, Maximum 0. Jeder neue Tippfehler in einer Spalte bricht künftig den Build.

## P03 – CRM vollständig · Branch `umbau/p03-crm` (CRM, Portal nur Typen-Sync)

### Was ist anders

1. Die **Dubletten-Prüfung** bei Anfragen findet wieder Treffer bei gleicher Mail, Telefonnummer oder gleichem Objekt.
2. **Regie-Position bearbeiten** im CRM speichert wieder. Vorher scheiterte es bei jedem Versuch.
3. **E-Mail-Protokoll:**
   - Einzelne Mails lassen sich öffnen.
   - Antworten von Kunden werden der ursprünglichen Mail zugeordnet.
4. **Kundendetail:**
   - Die Angebote hängen am richtigen Auftrag.
   - Der Mailverlauf des Kunden erscheint.
5. **Weitere reparierte Funktionen:**
   - Die Glocke zeigt wieder Partner-Anfragen.
   - Der Titel im Abnahmeprotokoll ist korrekt.
   - Die Dokumentsuche findet Dokumente.
   - Datenschutz-Löschung und -Auskunft laufen durch.
   - Das Löschen eines Leads funktioniert.
6. **Nie eingespielte Tabellen und Spalten nachgeholt:**
   - E-Mail-Vorlagen in den Einstellungen,
   - Kommunikations-Vorlagen,
   - Datenschutz-Aufschub,
   - Vertrags- und Compliance-Spalten.

### So testen Sie (Staging)

1. Anfrage mit derselben E-Mail wie eine bestehende anlegen → Dubletten-Hinweis erscheint.
2. Auftrag mit Regie-Position → Regie bearbeiten → Speichern → kein Fehler, Wert bleibt.
3. Einstellungen → E-Mail → Vorlagen erscheinen, Test-Mail geht (auf Staging an den Mail-Catcher).
4. Kunde öffnen → Bereich Mails → Verlauf sichtbar. Angebote stehen beim passenden Auftrag.

### Geprüft

- **CRM-Spaltenprüfung ist jetzt Teil des Builds.**
  - Die Ausnahmeliste enthält nur Funktionen von der Streichliste (29, jede mit Grund).
  - Das Maximum ist festgeschrieben.
- **Gegen Prod** bleiben nur die Stellen, die die neue Migration abdeckt.

### Für Prod nötig

- Migration `20261212130000_p03_fehlende_tabellen_spalten.sql`. Sie ist idempotent, legt nur an und löscht nichts.

## P04 – Nichts hängt · Branch `umbau/p04-nichts-haengt` (CRM + Portal)

### Was ist anders

1. **Kein endloser Spinner mehr bei Abbruch.** An 32 Stellen bleibt der Knopf nicht mehr hängen, wenn die Verbindung abbricht. Stattdessen kommt „Keine Verbindung zum Server. Ihre Eingaben sind noch da. Bitte erneut versuchen.“
   - **CRM:** Anfrage und Angebot anlegen, Kunde schnell anlegen, Handwerker auswählen, Portal-Link senden, Zahlungserinnerung.
   - **Portal:** Login und Registrierung, Partner-Abnahme, Projektvertrag, Rahmenvertrag, HV-Abnahme, Termine und Rückfragen.
2. **Partner-Uploads:** höchstens 4 MB je PDF und 4 MB je Upload, mit Meldung vorab. Vorher scheiterten größere Dateien ohne Meldung.
3. **Portal-Login** zeigt sofort das Formular. Die Ladeanzeige erscheint nur noch beim Anmelde-Link.
4. **14 Icons** im CRM, die bisher leer blieben, sind da, zum Beispiel Büroklammer, Prozent, Kamera und Login.

### So testen Sie (Staging)

1. Anfrage anlegen, dann im Browser das Netz abschalten (DevTools → Offline) und speichern → Meldung erscheint, Knopf wieder frei, Eingaben stehen noch.
2. Partner-Portal → Unterlagen hochladen → eine PDF über 4 MB wählen → Meldung vor dem Hochladen.
3. `/portal/login` in einem neuen Fenster → das Formular steht sofort da.
4. Angebots-Assistent → Büroklammer- und Prozent-Icons sichtbar. Kunde → Login-Knopf mit Icon.

### Bewusst offen

- Die abgeschnittene Beschriftung der mobilen Aktionsleiste. Sie wird mit P21 (Aufgaben-Karte) neu gebaut.

## P05 – Liste und Auftrag · Branch `umbau/p05-liste-auftrag` (CRM)

### Was ist anders

1. **Die Vorgangsliste zählt, filtert und summiert über alle Vorgänge**, nicht nur über die ersten 50. Auf dem Handy springt die Liste nicht mehr seitenweise.
2. **Ein Auftrag mit gestellter Abschlagsrechnung lässt sich bearbeiten.** Nur eine gestellte Voll- oder Schlussrechnung sperrt noch.
3. **Rechnungsstatus in der Liste** wie im Detail: „Überfällig“ statt „Gesendet“, gleicher Status in gleicher Farbe.
4. **Rechnungsbeträge mit Cent,** die Summe mit €, der Betrag bricht nicht mehr um.

### So testen Sie (Staging, 71 Vorgänge)

1. Vorgänge → Filter „Rechnung“ → der Zähler zeigt alle Rechnungen. Unten gibt es keine „Seite 1 von 2“ mehr.
2. Musterverwaltung-Vorgang auf Seite 2 (früher): Filter und Suche finden ihn in der Liste.
3. Auftrag mit Abschlagsrechnung → „Auftrag bearbeiten“ ist aktiv.
4. Rechnungsliste → überfällige Rechnungen stehen als „Überfällig“ da, Beträge mit Cent.

## Block A gesamt: Reihenfolge für Prod (nach Abnahme)

1. Backup der Prod-Datenbank.
2. Migrationen in dieser Reihenfolge:
   1. `20261212120000_auftrag_positionen_kunde_akzeptiert_at.sql`
   2. `20261212130000_p03_fehlende_tabellen_spalten.sql`
3. Merge von `umbau/p05-liste-auftrag` nach `main` in CRM und Portal, dann Deploy.
4. Gegenprobe: `TARGET=prod python3 scripts/audit/code-vs-schema.py` → nur noch Streichlisten-Einträge.

# Block B1 – Geld und Auftrag (P06–P10)

Stand: CRM `umbau/p10-angebot-versionen`, Portal `umbau/p07-rechenkern` (enthalten jeweils alle vorherigen Pakete).

## P06 – Auftrag erteilen = eine Funktion

### Was ist anders

1. Nimmt ein Kunde oder die HV ein Angebot im Portal an, legt jetzt das CRM den Auftrag an, **genauso vollständig wie bei Annahme im CRM**:
   - Positionen und Partner-Zuweisung,
   - Zahlungsplan und Verträge,
   - Auftragsbestätigung per Mail, Meilensteine.
2. Scheitert das, wird die Annahme zurückgesetzt, und der Kunde sieht eine Meldung. Es gibt **keinen halben Auftrag** mehr.
3. **Datenbank-Regel:** höchstens ein Auftrag je Angebot.

### So testen Sie (Staging)

1. Staging-CRM: ein Angebot an einen Portal-Kunden senden.
2. Über „Kundenportal öffnen“ das Angebot annehmen.
3. Im CRM hat der Auftrag Positionen, die Partner-Zuweisung (falls im Angebot), einen Zahlungsplan (falls gewählt) und einen Eintrag im Verlauf.

### Für Prod nötig

- Migration `20261213120000_p06_ein_auftrag_je_angebot.sql`.
- Im Portal müssen `NEXT_PUBLIC_CRM_URL` und `PDF_SERVICE_SECRET` stimmen.
  - **Achtung:** Lokal steht dort `dashboard.baerenwaldmuenchen.de`. Diese Adresse hat keinen DNS-Eintrag.
  - In Netlify prüfen, welche CRM-Adresse das Prod-Portal nutzt, sonst scheitern auch die Portal-PDFs.

## P07 – Ein Rechenkern

### Was ist anders

1. Die **Vorgangsliste zeigt je Auftrag denselben Betrag wie das Auftragsdetail.** Bisher wurde der Zeilenbetrag noch einmal mit der Menge multipliziert.
   - In Prod betraf das 13 von 26 Aufträgen, zum Beispiel 188.674 € statt 7.681 €.
   - Nachlass und Regie (Stunden × Kundensatz) rechnen jetzt richtig.
2. **Auftragsänderungen im Kundenportal** nutzen denselben Kern, ohne Doppel-Multiplikation.

### So testen Sie

- Vorgänge → Filter „Auftrag“ → Betrag eines Auftrags merken → Auftrag öffnen: Der Betrag unter „Leistungen“ ist identisch.

## P08 – Rechnung nach Versand

### Was ist anders

1. **„Stornieren“ einer versendeten, bezahlten oder überfälligen Rechnung** erzeugt immer eine Storno-Gutschrift als Beleg für den Kunden. Ein Entwurf wird einfach verworfen.
2. **„Storno zurücknehmen“ gibt es nicht mehr.** Ein Storno ist endgültig.
3. **Korrektur:** Ändert man Fälligkeit oder Zahlungsbedingungen im Korrektur-Assistenten, entsteht Storno plus neue Rechnung. Ein stilles Überschreiben des versendeten PDFs gibt es nicht mehr.
4. **Bleibt:** Die Karte „Zahlungsziel“ verschiebt nur die interne Fälligkeit (Stundung, Mahnungen), das PDF bleibt unverändert.

### Hinweis

- In `RechnungDetailClient.tsx` liegt eine nicht committete Änderung von Cursor: „Rechnung komplett stornieren ohne Storno-Gutschrift“. Die widerspricht der Entscheidung und ist nicht übernommen.
- Die Server-Aktion dahinter erzeugt ab P08 ohnehin eine Gutschrift.

## P09 – Abschlag und Schluss ohne Zahlungsplan

### Was ist anders

1. Im Auftrag → Zahlung gibt es jetzt **„Abschlag stellen“** (Prozent oder Betrag brutto) und **„Schlussrechnung“**. Einen Plan vorher anlegen ist nicht mehr nötig.
2. **Die Schlussrechnung zieht gestellte Abschläge automatisch ab** und rechnet sich neu, wenn ein Abschlag dazukommt.
3. **Die Vorlagen 50/50, 30/70 und 30/40/30 sind entfernt.**

### So testen Sie (auf Staging von Claude schon geprüft)

- Auftrag „PRODSIM-Fugenlose Badsanierung“ → Zahlung → „Abschlag stellen“ → 10 %.
- Ergebnis: Zeile „2. Abschlag 3.350,50 €“, die Schlussrechnung sinkt von 13.402,02 € auf 10.051,51 €.

## P10 – Angebots-Versionen

### Was ist anders

1. **Ein Angebot, das schon beim Kunden war, wird beim Bearbeiten nicht mehr überschrieben.** Es entsteht eine neue Version mit neuer Nummer.
2. **Die alte Version** gilt als „ersetzt“ und verweist auf die neue, genau wie bei einer Annahme im Portal.
3. **Ausnahmen:** Entwürfe werden weiter direkt gespeichert, Auftrags-Korrektur und Nachtrag bleiben unverändert.

### So testen Sie

1. Gesendetes Angebot → „Angebot bearbeiten“ → eine Position ändern → Speichern.
2. Es gibt eine neue Angebotsnummer. Die alte steht als ersetzt da.

# Block B2 – Einsatz (P11–P13)

## P11 – Einsatz im CRM

### Was ist anders

1. Im Auftrag → Übersicht steht ganz oben die Karte **„Einsätze“**.
2. Über **„Einsatz“** legst du im Sheet „Einsatz anlegen“ fest: Partner, Titel, Anweisung, Termin, Ort, Kontakt vor Ort und EK netto oder brutto.
   - Ort, Kontakt und Titel sind aus der Anfrage vorbelegt.
3. **„Senden“** legt den Einsatz an und schickt dem Partner die Mail „Neuer Einsatz“.
   - Die Mail enthält keine Positionen und keine Verkaufspreise.
4. **Die Karte zeigt je Einsatz** Partner, Titel, Termin, EK und Status (Gesendet, Angenommen, Abgelehnt, Fertig).
   - Nach „Fertig“ erscheinen dort auch Beschreibung, Fotos, Dokumente und die Partner-Rechnung.
5. **„Zurückziehen“** geht, solange der Partner noch nicht angenommen hat.

### So testen Sie (auf Staging von Claude schon geprüft)

1. Auftrag „PRODSIM-Fugenlose Badsanierung“ → Übersicht → „Einsatz“ → Elektro Muster GmbH, EK 1.200 netto → „Senden“.
2. Ergebnis: Die Karte zeigt den Einsatz mit Status „Gesendet“, und die Mail liegt im Staging-Mail-Catcher (E-Mail-Protokoll).

### Für Prod nötig

- Migration `20261214120000_p11_einsaetze.sql`: neue Tabelle, ändert nichts Bestehendes.

## P12 – Einsatz im Partner-Portal

### Was ist anders

1. Auf der Startseite des Partner-Portals steht **„Ihre Einsätze“** mit Anweisung, Termin, Ort, Kontakt und Vergütung.
2. **„Annehmen“ oder „Ablehnen“:** Beim Ablehnen ist ein Grund Pflicht, das CRM sieht ihn.
3. **„Fertig melden“ in einem Schritt:** Fotos und Dokumente (zusammen höchstens 4 MB) und eine optionale Beschreibung.
4. **„Rechnung senden“ nach der Fertigmeldung:** PDF hochladen oder Freitext-Positionen mit Betrag eintragen.
5. **Doppelklicks sind abgesichert:** Ein Statuswechsel gilt nur, wenn der vorherige Status noch stimmt.

### So testen Sie (Staging)

1. Im Staging-CRM über den Partner „Elektro Muster GmbH“ „Partnerportal öffnen“ → Startseite → „Ihre Einsätze“.
2. Annehmen → Fertig melden mit einem Foto → Rechnung mit einer Position senden.
3. Im CRM am Auftrag: Status „Fertig“, Foto als Link, Partner-Rechnung mit Betrag.

### Nicht von Claude geklickt

- Die Partner-Seite selbst. Ohne Partner-Login kann ich sie nicht öffnen.
- Typen und alle Build-Prüfungen sind grün, und der Weg ist über die CRM-Seite abgesichert.
