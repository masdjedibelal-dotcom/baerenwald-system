# Typen-Paket · Teil 1 — CRM: Typen neu erzeugen, Grundlinie einfrieren

Repo: **baerenwald-system**. Eigener Branch. Drei Commits, nach jedem anhalten.
Ziel: Build wieder grün, ohne einen einzigen Fehler zu verstecken.

---

## T1-CRM: Erst wissen, was echt kaputt ist — dann einfrieren

> **Grundregel: keine Prüfung im Browser.** Keine Screenshots, kein Playwright, kein Dev-Server,
> kein Login, kein E2E-Test. Nachweis über die Ausgabe des Guards, `npx tsc --noEmit`,
> `npm run build`. Nach jedem Teil anhalten.

### Ausgangslage

Der Spalten-Guard meldet **65 Verstöße (34 eindeutige)** und hält den Build rot. Bevor davon
irgendetwas repariert wird, muss eine Frage geklärt sein: **sind die generierten Typen aktuell?**

`src/types/supabase.ts` trägt den Stand **19.09.** Mindestens eine gemeldete Spalte (`partner_id`)
ist in einer Migration definiert. Wenn die Typdatei veraltet ist, ist ein Teil der Meldungen
falsch — die Spalte existiert, nur die Wahrheitsquelle kennt sie nicht.

Würden diese Fälle jetzt „repariert", benennt man **funktionierende** Spalten in falsche um, und
der Guard meldet danach grün. Das wäre schlimmer als der Ausgangszustand.

---

### Teil 1 — Typen neu erzeugen

1. Typdatei aus dem echten Schema neu erzeugen (`supabase gen types typescript`, Ziel
   `src/types/supabase.ts`). Braucht Netz und Zugangsdaten. Wenn das aus deiner Umgebung nicht
   geht: **den fertigen Befehl ausgeben und anhalten**, Belal führt ihn aus. Nicht basteln, nicht
   die Datei von Hand ergänzen.
2. Gegen welche Datenbank erzeugt wird, im Bericht nennen. Staging und Prod müssen dasselbe
   Schema haben; falls nicht, ist das ein eigener Befund und gehört gemeldet.
3. Der Diff der Typdatei kommt in den Commit — nicht zusammen mit Codeänderungen.

**Anhalten.** Commit: `chore(crm): Supabase-Typen neu erzeugt`

---

### Teil 2 — Neu zählen und trennen

4. Guard erneut laufen lassen. Vergleich mit dem alten Lauf, als Tabelle:
   | | vorher | nachher |
   |---|---|---|
   | geprüft | 3816 | |
   | übersprungen | 731 | |
   | Verstöße | 65 (34 eindeutig) | |

5. Jede Meldung, die **verschwunden** ist, war ein Typ-Problem und kein Codefehler. Diese Liste
   gesondert ausweisen — sie ist der Beleg dafür, dass die Typdatei veraltet war, und sie zeigt,
   wie oft das noch passieren kann.

6. Die **verbliebenen** Verstöße nach Schaden sortieren, nicht nach Datei:
   | Stufe | Kriterium | Beispiele aus dem alten Lauf |
   |---|---|---|
   | 1 | Geld | `angebote.gesamt_preis`, Positionspreise |
   | 2 | Kontaktdaten und Versand | `leads.telefon`, `leads.email`, `email_log.*` |
   | 3 | Rest | alles Übrige |
   Nur sortieren und listen. **Nichts reparieren** — das ist ein eigener Auftrag.

**Anhalten.** Commit: nur Dokumentation, `docs/TODO-ENTWICKLUNG.md`

---

### Teil 3 — Grundlinie einfrieren

7. Die verbliebenen Verstöße in eine Grundlinie schreiben:
   `scripts/db-spalten-baseline.txt`, **eine Zeile je Verstoß**, Format
   `<datei>:<tabelle>:<spalte>`. Nicht nur eine Anzahl — sonst rutscht ein neuer Verstoß durch,
   sobald ein alter behoben wird.
8. Guard-Verhalten danach:
   - Verstoß **in** der Grundlinie → Warnung, kein Abbruch
   - Verstoß **nicht** in der Grundlinie → **Abbruch**
   - Eintrag in der Grundlinie, der nicht mehr auftritt → Hinweis „behoben, bitte Zeile
     entfernen", kein Abbruch
   Die Grundlinie darf also schrumpfen, aber nicht wachsen.
9. Am Ende jedes Laufs eine Zeile: `Grundlinie: N offen (Stand <Datum>)`. Das ist der Zähler, an
   dem man sieht, ob die Schuld abgebaut wird oder liegen bleibt.
10. Die bisherige `scripts/db-spalten-allowlist.txt` (für nicht auflösbare Fälle) bleibt getrennt
    davon bestehen. Zwei verschiedene Dinge: die eine sagt „kann ich nicht prüfen", die andere
    „ist kaputt, aber bekannt". Nicht zusammenlegen.

**Anhalten.** Commit: `feat(crm): Grundlinie für den Spalten-Guard, Build wieder grün`

---

### Abnahme

- `npm run build` **grün** im CRM
- Testweise `.select('id, gibtesnicht')` → Guard bricht ab (nicht in der Grundlinie)
- Testweise eine Zeile aus der Grundlinie im Code beheben → Guard meldet „behoben", bricht nicht ab
- Die drei Listen aus Teil 2 liegen im Bericht: verschwunden / Stufe 1 / Stufe 2 / Stufe 3

### Bericht

Die Vergleichstabelle, die Liste der durch die neuen Typen verschwundenen Meldungen, die nach
Schaden sortierten Restverstöße, und der Startwert der Grundlinie.

**Danach:** T2-Portal. Dort kommt die Typdatei über den Sync an — der Sync läuft **aus dem CRM**,
also nach diesem Auftrag.
