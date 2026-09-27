# Typen-Paket · Teil 2 — Portal: eigene Typen, kein stilles Überspringen

Repo: **baerenwald**. Eigener Branch. Drei Commits, nach jedem anhalten.
Voraussetzung: **T1-CRM ist durch** (Typen neu erzeugt) und A5-Portal (`preis_kunde`) ebenfalls.

---

## T2-Portal: Der Guard darf nicht heimlich nichts tun

> **Grundregel: keine Prüfung im Browser.** Keine Screenshots, kein Playwright, kein Dev-Server,
> kein Login, kein E2E-Test. Nachweis über die Guard-Ausgabe, `npx tsc --noEmit`,
> `npm run build`. Nach jedem Teil anhalten.

### Befund — und warum Teil 1 dringend ist

`scripts/check-db-spalten.mjs` sucht die Wahrheitsquelle in drei Stufen:

```
1. src/types/supabase.ts            → gibt es im Portal nicht
2. ../baerenwald-system/src/…       → der CRM-Ordner nebenan
3. sonst: "Guard übersprungen."     → und weiter mit Erfolg
```

Stufe 3 ist das Problem. Auf Netlify baut das Portal allein; einen CRM-Ordner nebenan gibt es
dort nicht. Der Guard meldet also im Deploy **Erfolg, ohne irgendetwas geprüft zu haben** — und
niemand merkt es, weil grün wie geprüft aussieht.

Das ist genau dasselbe Muster, das wir in dieser Woche dreimal ausgeräumt haben: ein Fehlschlag,
der als Erfolg gemeldet wird. Nur diesmal in dem Werkzeug, das solche Fehler finden soll.

---

### Teil 1 — Eigene Typdatei über den Sync

1. `src/types/supabase.ts` in das Sync-Manifest des CRM aufnehmen
   (`scripts/shared-domain-files.json` im CRM), Zielpfad im Portal **identisch**:
   `src/types/supabase.ts`.
2. Prüfen, ob die Import-Umschreibungen des Sync-Skripts (`@/lib/vorgang/` → `@/lib/crm-vorgang/`
   und die übrigen) auf diese Datei zutreffen. Eine generierte Typdatei enthält keine solchen
   Importe — falls das Skript trotzdem etwas ersetzt, die Datei von der Umschreibung ausnehmen.
3. Im CRM `npm run sync:shared-domain` ausführen, damit die Datei im Portal ankommt.
4. Ab jetzt bewacht `check-shared-domain-sync` auch diese Datei: läuft sie auseinander, bricht der
   Build. Genau richtig — Portal und CRM sprechen mit derselben Datenbank, zwei verschiedene
   Schema-Wahrheiten darf es nicht geben.
5. Die Datei ist im Portal **nicht** von Hand zu bearbeiten. Kopfzeile wie bei den übrigen
   synchronisierten Dateien: `// SYNCED FROM CRM — do not edit`.

**Anhalten.** Commit: `chore(portal): Supabase-Typen über den Sync`

---

### Teil 2 — Die dritte Stufe entfernen

6. Stufe 2 (CRM-Nachbarordner) und Stufe 3 (stilles Überspringen) **beide löschen**. Der Guard
   liest ausschließlich `src/types/supabase.ts` im eigenen Repo.
7. Fehlt die Datei, bricht der Guard ab mit einer Meldung, die sagt, was zu tun ist:
   „Typdatei fehlt — im CRM `npm run sync:shared-domain` ausführen."
   **Kein** stiller Erfolg, unter keinen Umständen, auch nicht in CI.
8. Denselben Rückfall-Mechanismus in den übrigen Guards suchen
   (`grep -rn "übersprungen\|skip\|sibling\|baerenwald-system" scripts/`). Jeder Guard, der sich
   selbst abschalten kann, wenn eine Voraussetzung fehlt, hat dasselbe Problem. Liste im Bericht;
   beheben nur dort, wo es dieselbe stille Erfolgsmeldung ist.

**Anhalten.** Commit: `fix(portal): Spalten-Guard überspringt nicht mehr stillschweigend`

---

### Teil 3 — Grundlinie einfrieren

9. Guard mit der neuen Typdatei laufen lassen. Zahlen nennen und mit dem alten Lauf vergleichen
   (vorher: geprüft 2169, übersprungen 338, Verstöße 26 / 20 eindeutig). Nach A5-Portal sollten
   die `preis_kunde`-Meldungen weg sein.
10. Verbleibende Verstöße nach demselben Schema wie im CRM sortieren: Stufe 1 Geld, Stufe 2
    Kontaktdaten und Versand, Stufe 3 Rest. **Nur listen, nicht reparieren.**
11. Grundlinie `scripts/db-spalten-baseline.txt` anlegen, eine Zeile je Verstoß im Format
    `<datei>:<tabelle>:<spalte>`. Verhalten identisch zum CRM: in der Grundlinie → Warnung,
    nicht enthalten → Abbruch, verschwunden → Hinweis „behoben, Zeile entfernen".
    Die Grundlinie darf schrumpfen, nicht wachsen.
12. Schlusszeile bei jedem Lauf: `Grundlinie: N offen (Stand <Datum>)`.

**Anhalten.** Commit: `feat(portal): Grundlinie für den Spalten-Guard, Build wieder grün`

---

### Abnahme

- `npm run build` **grün** in beiden Repos
- Typdatei im Portal vorhanden, mit Sync-Kopfzeile, vom Sync-Guard bewacht
- Testweise die Typdatei umbenennen → Guard **bricht ab** mit der Anweisung aus Punkt 7, keine
  Erfolgsmeldung
- Testweise `.select('id, gibtesnicht')` → Abbruch
- Kein Guard im Portal kann sich mehr selbst überspringen (Liste aus Punkt 8 im Bericht)

### Bericht

Die Zahlen vorher / nachher, die nach Schaden sortierten Restverstöße, der Startwert der
Grundlinie, und die Liste aus Punkt 8 — welche Guards sich heute noch selbst abschalten können.

**Danach:** beide Builds sind grün, und Paket B-CRM kann starten. Ein roter Build während B kommt
dann von B und nicht von einem Altlast-Guard — das ist der eigentliche Zweck dieses Auftrags.
