# Paket D · CRM — Eine Rechenquelle für alle drei Oberflächen

Repo: **baerenwald-system**. Eigener Branch. Zwei Commits, nach jedem anhalten.
Voraussetzung: **B-CRM ist durch** (beide Sätze existieren).

---

## Auftrag D-CRM: Die Summe wird einmal gerechnet, nicht dreimal

> **Grundregel: keine Prüfung im Browser.** Keine Screenshots, kein Playwright, kein Dev-Server,
> kein Login, kein E2E-Test. Nachweis nur über `grep`, `npx tsc --noEmit`, `npm run build`.
> Nach jedem Teil anhalten.

### Warum

Dieselbe Regieposition ergibt heute drei verschiedene Zahlen:

| Ort | Ergebnis bei 10 Std × 75,50 € |
|---|---|
| CRM, Positionsliste unten | **755,00 €** — richtig |
| Handwerkerportal, Gesamtsumme | **75,50 €** — nimmt den Satz als Zeilenbetrag |
| Kundenportal | Regie kommt überhaupt nicht vor |

Das ist kein Anzeigefehler an drei Stellen, sondern **drei Rechenstellen für dieselbe Zahl**. Wenn
nur die Anzeige geflickt wird, stehen in zwei Monaten wieder drei Zahlen da. Dieser Auftrag baut
die eine Quelle; D-Portal schließt die Portale daran an.

---

### Teil 1 — Berechnung in die geteilte Schicht heben

Heute rechnet `src/lib/auftraege/auftrag-positionen-rechnung.ts` richtig, liegt aber im CRM und
ist für das Portal nicht erreichbar. Für genau diesen Fall gibt es den Sync-Mechanismus:
`src/lib/shared-domain/` im CRM ist die Quelle, `npm run sync:shared-domain` kopiert nach
`baerenwald`, und `check-shared-domain-sync` bewacht die Gleichheit.

1. Eine neue Datei `src/lib/shared-domain/regie-betrag.ts` mit **reinen Funktionen**, ohne
   Datenbankzugriff, ohne Supabase-Import, ohne React:
   - `regieMengeStunden(erfassteMinuten, geschaetzteStunden)` — Stunden aus erfasster Zeit, sonst
     Schätzung, sonst 1
   - `regieBetragPartner(menge, stundensatz)`
   - `regieBetragKunde(menge, stundensatzKunde, stundensatzFallback)` — leerer Kundensatz fällt
     auf den Partnersatz zurück, damit Altdaten unverändert bleiben
   - `positionBetrag(position, seite)` mit `seite: 'partner' | 'kunde'` — deckt Regie **und**
     Pauschalpositionen ab, damit Summen nicht wieder zwei Wege nehmen
   - `summeBetraege(positionen, seite)`
   Rundung an **einer** Stelle, auf zwei Nachkommastellen, kaufmännisch. Nicht in jeder Funktion
   einzeln runden — sonst laufen Summe und Einzelzeilen um Cent auseinander.
2. Die Datei in die Sync-Liste aufnehmen, damit `check-shared-domain-sync` sie ab sofort bewacht.
3. `auftrag-positionen-rechnung.ts` rechnet nicht mehr selbst, sondern ruft diese Funktionen auf.
   **Das Ergebnis muss identisch bleiben** — das ist eine Umstellung, keine Änderung der Zahlen.
4. Dasselbe für alle weiteren CRM-Stellen, die Regie- oder Positionsbeträge rechnen. Finde sie mit
   `grep -rn "stundensatz\|preis_fix\|preis_partner" src/ --include=*.ts` und stelle jede um, die
   rechnet (nicht die, die nur anzeigen). Liste im Bericht.
5. Einheitentests für die reinen Funktionen: erfasste Zeit statt Schätzung, leerer Kundensatz,
   Menge 0, Satz 0, krumme Minuten (z. B. 95 Min). Kein Browser, keine Datenbank — reine
   Funktionen lassen sich direkt prüfen.

**Anhalten.** Commit: `refactor(crm): Regie- und Positionsbeträge in shared-domain`

---

### Teil 2 — Sichtbarkeit der Regie für den Kunden vorbereiten

Das Kundenportal kennt Regie heute überhaupt nicht — kein Baustein dort liest sie. Damit D-Portal
etwas anzeigen kann, muss das CRM die Daten kundenseitig überhaupt herausgeben.

6. Prüfe, welche Regiepositionen für den Kunden sichtbar sein dürfen. `auftrag_positionen` hat
   `fuer_kunde_sichtbar` — kläre, ob dieses Feld heute bei Regie gesetzt wird, und setze es bei
   der Annahme aus Paket B/C **bewusst**. Positionen in Prüfung bleiben unsichtbar.
7. Die kundenseitige Abfrage liefert je Regieposition: Titel und Beschreibung **nach** Korrektur,
   Stunden, Kundensatz, Betrag, Datum der Annahme. Nicht: Partnersatz, Partnerbetrag, interne
   Notizen, Ablehnungsgründe, Korrekturbegründung.

   Die Korrekturbegründung ist für den Handwerker bestimmt, nicht für den Kunden — sie erklärt,
   warum ihr ihm etwas gekürzt habt. Im Kundenportal hat sie nichts zu suchen.
8. Der Zeitstempel der Annahme ist zugleich der Nachweis, ab wann der Kunde informiert war. Er
   gehört in die Ausgabe.

**Anhalten.** Commit: `feat(crm): Regie kundenseitig sichtbar machen`

---

### Abnahme

- `src/lib/shared-domain/regie-betrag.ts` enthält keine Supabase- und keine React-Importe
- `check-shared-domain-sync` kennt die neue Datei
- Die Einheitentests aus Punkt 5 laufen
- Die Beträge im CRM sind nach der Umstellung unverändert — bei einer Abweichung anhalten und
  melden, nicht die Tests anpassen
- Kein Partnerwert in der kundenseitigen Ausgabe (per `grep` belegen)
- `npx tsc --noEmit` und `npm run build` grün

### Bericht

Liste der umgestellten Rechenstellen aus Punkt 4, die Testfälle aus Punkt 5, und was Punkt 6 über
`fuer_kunde_sichtbar` ergeben hat.

**Danach:** `npm run sync:shared-domain` ausführen, damit das Portal die neue Datei bekommt —
sonst kann D-Portal nicht darauf aufsetzen.
