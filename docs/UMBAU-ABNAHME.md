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

## P13 – Regie und Behinderung als Mitteilung

### Was ist anders

1. **Partner-Portal:** Bei einem angenommenen Einsatz gibt es „Regie oder Behinderung“.
   - **Regie:** Stunden, Beschreibung, optional ein Foto.
   - **Behinderung:** Beschreibung.
2. **CRM:** Offene Mitteilungen erscheinen in der Einsatz-Karte unter dem jeweiligen Einsatz.
   - **„Als Regie übernehmen“** öffnet ein Sheet mit Stunden, Partnersatz und Aufschlag (vorbelegt 20 %). Es zeigt Kundensatz und Betrag live und legt eine Regie-Position im Auftrag an. Der Kunde muss nicht zustimmen.
   - **„Verwerfen“** (Regie) bzw. **„Erledigt“** (Behinderung) schließt die Mitteilung.
3. **Danach** den Auftrag wie gewohnt über „Auftrag bearbeiten“ erneut an den Kunden senden.

### So testen Sie (Staging, von Claude für den CRM-Teil geprüft)

1. Partner meldet Regie, 3 Std → im CRM „Als Regie übernehmen“ → Partnersatz 50 €.
2. Ergebnis: Kundensatz 60 €, Position 180 € netto. Die Mitteilung steht auf „übernommen“.

### Rückfrage

- Gibt es einen festen Standard-Aufschlag für Regie? In den Einstellungen habe ich keinen gefunden, deshalb sind 20 % vorbelegt (änderbar).

### Für Prod nötig

- Migration `20261214130000_p13_einsatz_mitteilungen.sql`: neue Tabelle.

# Block B3 – Status und Mail (so weit ohne Prod-Datenumbau)

## P15 (Teil) – Einsatz-Ereignisse in der Glocke

### Was ist anders

- Die CRM-Glocke meldet, wenn ein Partner einen Einsatz annimmt, ablehnt (mit Grund), fertig meldet oder eine Rechnung schickt. Offene Regie- und Behinderungs-Meldungen erscheinen dort ebenfalls.
- Auf Staging geprüft: „Elektro Muster GmbH: Einsatz angenommen“.

## P14 (Texte) – Status-Vokabular des Zielbilds

### Was ist anders

- **Auftrag:** „Läuft“ statt „In Arbeit“, „Abgenommen“ statt „Abgeschlossen“.
- **Rechnung:** „Offen“ statt „Gesendet“, „Rechnung fehlt“ statt des doppelten „Offen“ für Aufträge ohne Rechnung.
- In Liste, Detail und Portal, weil der Text zentral steht.

### Bewusst noch nicht

- **Die gespeicherten Status (35 → 17) umschlüsseln:** Das ändert echte Daten und braucht Probelauf und Backup. Eigene Sitzung.
- **Ein gemeinsames Ereignis-Protokoll und ein Mail-Weg für CRM und Portal:** eigene Sitzung.

# Block C – Entfernen (Einstiege)

## P16/P17 (Einstiege)

### Was ist anders

- **Navigation im CRM:** nur noch Dashboard, Vorgänge, Kunden, Partner und Einstellungen. Kalender und KI Analytics sind raus, auch unter „Mehr“ auf dem Handy.
- **Kopfzeile:** kein Knopf „KI-Hilfe“ mehr.
- **Dashboard:** Die Karte „Marketing & Sichtbarkeit“ mit den „Fehler“-Kacheln ist raus.

### Bewusst noch nicht

- **Den Code und die Tabellen dieser Bereiche löschen:** Copilot, KI-Hub, Kalender, To-dos, Bewertungen, SLA, Anlagen, Prüfpflichten, Einbehalt, Bürgschaft, Kostenträger. Das kommt in einer eigenen Sitzung, mit Backup und nachdem Block A–C abgenommen sind.
- **Die alte Partner-Ansicht mit Positionen (P18):** bleibt, bis du die Einsätze abgenommen hast.

# Block D – Details (Teil)

## P19/P25 (Sheets und Handy)

### Was ist anders

- **Sheets:** Jedes Sheet mit einer Hauptaktion hat unten links „Abbrechen“. Der Fuß sieht damit überall gleich aus.
- **Position bearbeiten:** Das Preisfeld mit „€“ davor und die USt-Auswahl stehen sauber nebeneinander.
- **Angebot öffnen:** Die Frage „Änderungen speichern?“ kommt nicht mehr, wenn man ein Angebot nur öffnet und gleich wieder schließt.
- **Handy, Auftrag und Angebot:** Hinter dem Titel ist kein Foto mehr. Lange Titel brechen um. Die Tabs blenden rechts aus, damit man sieht, dass weitere folgen.
- **Zurück-Link:** heißt nur noch „Zurück“.

### So testest du

1. Auf dem Handy einen Auftrag öffnen. Der Kopf ist ruhig und zeigt kein Foto, und die Tabs laufen rechts weich aus.
2. Ein Angebot öffnen und sofort schließen. Es kommt keine Speichern-Frage.
3. In einem Angebot eine Position bearbeiten. Das Preisfeld steht mit „€“ neben der USt.
4. Irgendein Bearbeiten-Sheet öffnen. Unten stehen „Abbrechen“ und die Hauptaktion.

### Bleibt

- Aufbau, Farben und Arbeitsflächen. Es wurden nur Details geändert.

### Geprüft

- Typprüfung und alle Build-Prüfungen sind grün.
- Auftrag lokal in Handygröße gegen die staging-Daten angesehen.

### Weg zurück

- Commit `f34ea3c97` zurücknehmen.

### Bewusst noch nicht

Das kommt jeweils in einer eigenen Sitzung:

- **P21 Aufgaben-Karte und Hauptaktion je Stand**
- **P22 Vorgang als eine Arbeitsfläche**
- **P23 Assistenten in drei Schritten**
- **P24 Texte**
- **P25 Rest:** Plus-Knopf und die gekürzte Aktion unten

## Nachtrag P08/P13 (Antworten vom 29.09.2026)

### Was ist anders

- **Rechnung nach Versand stornieren:** Bei offenen, überfälligen und bezahlten Rechnungen gibt es im Menü „…“ den Punkt „Stornieren“.
  - Die Rechnung wird storniert.
  - Eine Storno-Gutschrift entsteht als Entwurf und öffnet sich direkt, damit Sie sie an den Kunden senden.
  - Eine neue Rechnung entsteht nicht. Wer eine neue Rechnung braucht, nimmt weiter „Rechnung korrigieren“.
- **Regie:** Der Aufschlag ist nicht mehr mit 20 % vorbelegt.
- **Zurück-Link:** heißt jetzt auch bei Rechnung und Anfrage nur „Zurück“.

### Geprüft

- Lokal gegen staging an der Test-Rechnung `…0073` ausprobiert: Das Original steht auf „Storniert“, die Gutschrift über −23.800,00 € ist als Entwurf angelegt.

### Offen

- Netlify, Portal-Produktion:
  - `NEXT_PUBLIC_CRM_URL=https://baerenwald-backend.netlify.app`
  - `CRM_DASHBOARD_URL` auf denselben Wert, falls gesetzt
  - Danach neu bauen.

# Block D – Rest (30.09.2026)

### Was ist anders

- **P21, Nächster Schritt:** Anfrage, Angebot, Auftrag und Rechnung zeigen oben die Karte „Nächster Schritt“ mit einem Satz, der zur grünen Hauptaktion passt. Der Betrag steht im Kopf neben dem Status.
- **P23, Angebots-Assistent:** oben die Schritte „1 Kunde · 2 Positionen · 3 Prüfen und senden“. Unten steht „Weiter: Prüfen“. Der dritte Schritt zeigt Kunde, Empfänger, Summe, Gültigkeit und das echte PDF, und erst dort wird gesendet.
- **P24, Texte:** „Sie“ im ganzen CRM, im Partner-Portal, im Kundenportal und in den Mails an Partner. Das Angebots-PDF fällt nicht mehr auf „du“ zurück. Meldungen sind kurze Sätze statt Ketten wie „X — Y“. „Gespeichert“, „Status aktualisiert“ und Ähnliches erscheinen nicht mehr als Meldung, weil man es ohnehin sieht. Die öffentliche Website bleibt bei „du“.
- **P25, Handy:** Die Aktionsleiste unten zeigt Kurzformen („Bearbeiten“, „Annehmen“, „Bezahlt“) statt abgeschnittener Texte. Der Chip „Kundenakte“ ist 44 px hoch. Auf dem Desktop verdeckt der Plus-Knopf keine Detailseiten mehr.
- **Eine Wahrheit für „offen“:** Dashboard, Kennzahlen und Vorgänge-Liste zählen gleich. Vorher zeigte das Dashboard zum Beispiel 25 offene Angebote, weil es Entwürfe, Versionen und abgelaufene Angebote aus dem Zeitraum mitzählte.
- **Knöpfe reagieren wieder:**
  - Im Sammel-Commit `b3ef4c563` von Cursor gingen CSS-Regeln verloren, deren Klassen weiter benutzt werden. Betroffen waren unter anderem die Auswahllisten (Optionen klebten in einer Zeile), gestapelte Sheets und ein Sheet hinter einer Rückfrage.
  - Die Regeln sind wiederhergestellt.
  - „Angebot ablehnen“ zeigt den fehlenden Grund jetzt im Sheet. Vorher stand die Meldung unsichtbar dahinter.

### So testen Sie

1. Dashboard und Vorgänge-Liste öffnen. Die vier Zahlen oben entsprechen den Tabs der Liste.
2. Ein gesendetes Angebot öffnen und auf „Ablehnen“ klicken. Die Auswahlliste für den Grund zeigt die Optionen untereinander. Ohne Grund erscheint der Hinweis im Sheet.
3. Aus einer Anfrage „Angebot erstellen“ wählen. Oben stehen die drei Schritte, und „Weiter: Prüfen“ zeigt das PDF.
4. Auf dem Handy ein Angebot öffnen und nach unten scrollen. Die Knöpfe unten sind nicht abgeschnitten.

### Noch nicht

- **P22, Vorgang als eine Seite mit Phasenleiste:** eigene Sitzung.
- **Rechnungs-Assistent in drei Schritten:** analog zum Angebot, eigene Sitzung.
