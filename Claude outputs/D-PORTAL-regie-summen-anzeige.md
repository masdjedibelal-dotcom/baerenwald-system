# Paket D · Portal — Summen richtig, Regie beim Kunden sichtbar

Repo: **baerenwald** (Website + Portale). Eigener Branch. Drei Commits, nach jedem anhalten.
Voraussetzung: **D-CRM ist durch** und `npm run sync:shared-domain` wurde ausgeführt —
`src/lib/shared-domain/regie-betrag.ts` muss im Portal liegen.

---

## Auftrag D-Portal: Eine Zahl, zwei Zielgruppen

> **Grundregel: keine Prüfung im Browser.** Keine Screenshots, kein Playwright, kein Dev-Server,
> kein Login, kein E2E-Test. Nachweis nur über `grep`, `npx tsc --noEmit`, `npm run build`.
> Die Sichtprüfung macht Belal. Nach jedem Teil anhalten.

### Warum

Im Handwerkerportal zeigt die Gesamtsumme bei einer Regieposition von 10 Std × 75,50 € den Wert
**75,50 €** statt **755,00 €** — `preis_partner` wird als Zeilenbetrag genommen statt als Satz.
Im Kundenportal fehlt Regie vollständig: kein Baustein dort kennt sie, der Kunde sieht die
Mehrkosten nirgends.

Mit D-CRM gibt es jetzt eine gemeinsame Berechnung. Dieser Auftrag schließt beide Portale daran
an, statt an zwei Stellen neu zu rechnen.

---

### Teil 1 — Handwerkerportal: Gesamtsumme reparieren

1. `src/components/partner/PartnerLeistungenKonditionenCard.tsx` und jede weitere Stelle im
   Partnerbereich, die Beträge summiert, rechnet nicht mehr selbst, sondern ruft
   `summeBetraege(positionen, 'partner')` aus `@/lib/shared-domain/regie-betrag` auf.
2. Dieselbe Umstellung für die Zeilenbeträge: `positionBetrag(position, 'partner')` statt
   `preis_partner` direkt als Betrag zu verwenden.
3. Alle weiteren Rechenstellen im Partnerbereich finden und umstellen:
   `grep -rn "preis_partner\|stundensatz" src/components/partner/ src/components/shared/`.
   Jede Fundstelle im Bericht: umgestellt, oder reine Anzeige ohne Rechnung.
4. Bisher wurde Regie in der Gesamtsumme **ausgeblendet**, solange sie in Prüfung ist. Das bleibt
   so — aber sichtbar: eine Zeile unter der Summe, „1 Position in Prüfung, noch nicht enthalten".
   Ein Handwerker, der eine Zahl nicht wiederfindet, ruft an.

**Anhalten.** Commit: `fix(portal): Handwerker-Gesamtsumme rechnet Regie als Menge mal Satz`

---

### Teil 2 — Kundenportal: Regie sichtbar machen

5. In der Positionsliste des Kundenportals erscheinen angenommene Regiepositionen als eigene
   Zeilen, mit Titel, Beschreibung, Stunden, **Kundensatz**, Betrag und dem Datum der Annahme.
   Nur Positionen, die das CRM kundenseitig freigibt (D-CRM, Punkt 6) — in Prüfung oder abgelehnt
   erscheint nichts.
6. Die Gesamtsumme darunter enthält sie und wird mit `summeBetraege(positionen, 'kunde')`
   gerechnet. Nicht selbst addieren.
7. Eine Regieposition ist als Nacharbeit erkennbar — nicht als Sonderfall gestaltet, sondern über
   das vorhandene Abzeichen (`PortalStatusPill` bzw. die Kanon-Fläche). **Keine neue Komponente,
   keine neue Farbe.** Wir haben gerade erst 17 Sonderregeln entfernt.
8. Partnersatz, Partnerbetrag, Marge, interne Notizen und die Korrekturbegründung erscheinen
   nirgends im Kundenportal. Die Begründung erklärt dem Handwerker eine Kürzung — der Kunde hat
   damit nichts zu tun.
9. Dasselbe gilt für das HV-Portal: eine Hausverwaltung ist kundenseitig.

**Anhalten.** Commit: `feat(portal): angenommene Regie im Kundenportal mit Summe`

---

### Teil 3 — Absichern

10. Der Guard aus **B-Portal** (`check-preis-seiten.mjs`) muss die neuen Stellen abdecken. Prüfe,
    ob er greift; falls nicht, erweitern — nicht die Ausnahmeliste füllen.
11. Zusätzlich: der Guard bricht ab, wenn im Portal eine Summe über Positionen gebildet wird, ohne
    `summeBetraege` zu benutzen (Heuristik: `reduce(` in derselben Zeile oder Nachbarschaft wie
    `preis_partner`, `preis_fix`, `stundensatz`, `betrag`). Bestehende berechtigte Fälle kommen
    mit Begründung auf die Liste, die nicht wachsen darf.

    Das ist der Punkt, an dem verhindert wird, dass wieder eine vierte Rechenstelle entsteht.

**Anhalten.** Commit: `feat(portal): Guard gegen eigene Summenbildung`

---

### Abnahme

- Keine Stelle im Portal rechnet Regie oder Positionssummen selbst — alle über
  `@/lib/shared-domain/regie-betrag`
- `check-shared-domain-sync` grün (die Datei kommt aus dem CRM und wird hier nicht bearbeitet)
- Kein Partnerwert in kundenseitigen Bausteinen, kein Kundenwert im Partnerbereich
- Keine neue Komponente, kein neuer Token, keine neue Farbe
- `npx tsc --noEmit` und `npm run build` grün

### Bericht

Die Liste der umgestellten Rechenstellen, wo die Regie im Kundenportal eingehängt wurde, und was
Punkt 11 an bestehenden Eigenrechnungen gefunden hat.

---

## Reihenfolge der fünf Pakete

| Nr. | Datei | Repo |
|---|---|---|
| 1 | `B-CRM-regie-bearbeiten-zwei-saetze.md` | CRM |
| 2 | `B-PORTAL-regie-saetze-anzeige.md` | Portal |
| 3 | `C-CRM-regie-mails.md` | CRM |
| 4 | `D-CRM-regie-summen-quelle.md` | CRM |
| 5 | `D-PORTAL-regie-summen-anzeige.md` | Portal |

B-CRM ist die Voraussetzung für alles Weitere — dort entsteht der Kundensatz. Zwischen D-CRM und
D-Portal muss `npm run sync:shared-domain` laufen.
