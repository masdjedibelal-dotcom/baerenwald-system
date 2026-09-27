# FIX 7 · Portal — Partner sieht eine Aufgabe

Repo: **baerenwald**. Eigener Branch, ein Commit.
Voraussetzung: **FIX7-CRM ist durch** und die Migration ist auf Staging eingespielt.

> **Keine Prüfung im Browser**, kein Dev-Server, kein Login. Nachweis über `grep`,
> `npx tsc --noEmit`. Am Ende anhalten.

## Worum es geht

Im CRM bleiben die Positionen einzeln — für Angebot, Rechnung und Partnerabrechnung. Im
Partnerportal sollen sie unter **einer Aufgabe** erscheinen, mit dem Titel und der Beschreibung,
die Bärenwald bei der Zuweisung gesetzt hat. Ist dort nichts gesetzt, gilt wie bisher der
LV-Text der Positionen.

## Die Grundregel, die nicht verletzt werden darf

**Die Aufgabe ist eine Überschrift, keine neue Arbeitseinheit.** Zeiterfassung, Status, Fotos,
Regie melden und Abrechnung laufen weiterhin **je Position**. Der Partner sieht die Aufgabe als
Gruppe, arbeitet aber auf den Positionen darunter.

Wird das verwechselt, sind Zeiterfassung und Regie-Abrechnung kaputt — beides wurde gerade erst
gebaut.

## Aufgabe

1. Die Positionsliste im Partnerportal (`PartnerPositionLebenszyklusList` und die Stellen, die
   sie speisen) gruppiert nach `partner_aufgabe_id`:
   - Aufgabe als Gruppenkopf mit `titel`; darunter `beschreibung`, wenn gesetzt
   - Titel leer → Gruppenkopf zeigt den LV-Text der ersten Position oder, bei mehreren, eine
     schlichte Zusammenfassung. **Keinen Platzhaltertext erfinden** wie „Aufgabe 1".
   - Positionen ohne `partner_aufgabe_id` (Altbestand) erscheinen wie bisher einzeln, ohne
     Gruppenkopf. Es gibt keine Nachrüstung alter Daten.
2. Die Bedienelemente bleiben, wo sie sind: je Position starten, Fortschritt melden, Zeit
   erfassen, abschließen, Fotos, Regie melden. **Keine Sammelaktion auf Aufgabenebene** in diesem
   Auftrag — das wäre eine eigene fachliche Entscheidung.
3. Summen: eine Zwischensumme je Aufgabe ist erlaubt und sinnvoll. Sie wird über
   `summeBetraege(positionen, 'partner')` aus `@/lib/shared-domain/regie-betrag` gerechnet, nicht
   selbst addiert — sonst entsteht die vierte Rechenstelle, die wir gerade abgeschafft haben.
4. Die Gesamtsumme des Auftrags bleibt unverändert die Summe über alle Positionen, nicht die
   Summe der Gruppenköpfe.
5. Nichts vom Kunden zeigen: `leistung_name` bleibt die Kundenbezeichnung. Wenn ein Partnertitel
   gesetzt ist, sieht der Partner **diesen**, nicht beide nebeneinander. Ist keiner gesetzt, sieht
   er den LV-Text — das ist derselbe, den der Kunde sieht, und das ist in Ordnung.
6. Ebenso nichts vom Kunden in der Gegenrichtung: `stundensatz_kunde`, `preis_fix` und alles
   Kundenseitige bleiben aus dem Partnerbereich heraus. Der Guard `check-preis-seiten` deckt das
   ab — prüfen, ob er auch die neuen Felder erfasst, und falls nicht, erweitern.

## Abnahme

- Keine Stelle im Partnerbereich liest `partner_aufgabe_id`, um daraus Status, Zeit oder
  Abrechnung abzuleiten (per `grep` belegen) — die Gruppierung betrifft nur die Darstellung
- Positionen ohne Aufgabe erscheinen unverändert
- Zwischensummen laufen über `summeBetraege`, nirgends ein eigenes `reduce`
- `check-preis-seiten` und `check-shared-domain-sync` grün
- `npx tsc --noEmit` grün

## Bericht

Wo die Gruppierung eingehängt wurde, wie der Fall „kein Titel gesetzt" gelöst ist, und ob
`check-preis-seiten` für die neuen Felder erweitert werden musste.

Commit: `feat(portal): Positionen als Partner-Aufgabe gruppiert`
