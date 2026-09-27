# FIX 4 · CRM — Status ohne Schreibliste, Admin per Mailadresse

Repo: **baerenwald-system**. Eigener Branch. Zwei Commits, nach jedem anhalten.

> **Keine Prüfung im Browser.** Nachweis nur über `grep`, `npx tsc --noEmit`.

---

### Teil 1 — Die Lücke in der Statusdisziplin

`check-status-writes` ist grün. Trotzdem gehen an mehreren Stellen beliebige Strings als Status
in die Datenbank, weil dort gar keine Schreibliste existiert:

| Bereich | Schreibhelfer |
|---|---|
| Partner-Zuweisung | `writeAuftragHandwerkerStatus`, `writeAngebotHandwerkerStatus` |
| Nachtrag, Einbehalt, Fachdoku, Vertrag, HW-Formular, Partner-Dokument, Positions-Anfrage | Helfer ohne Liste |

Ausgerechnet dort liegen die mehrdeutigen Werte: `angenommen` bedeutet Kunden- **und**
Partnerannahme, `abgelehnt` gilt in vier Zusammenhängen, `ausstehend` in dreien.

1. Für jeden dieser Bereiche eine `*_WRITE_STATUSES`-Konstante anlegen, nach dem Muster von
   `ANGEBOT_WRITE_STATUSES` in `src/lib/status/write-angebot-status.ts`, und im Schreibhelfer
   über `assertKnownStatus` erzwingen.
2. **Die erlaubten Werte aus dem Bestand ableiten, nicht erfinden.** Sammle mit `grep`, welche
   Werte heute tatsächlich geschrieben und gelesen werden (inklusive Status-Vokabular), und nimm
   genau diese auf. Werte, die nur gelesen und nie geschrieben werden, gehören **nicht** in die
   Schreibliste.
3. Wo derselbe Wort-Wert in mehreren Listen vorkommt, im Code kommentieren, welche Bedeutung in
   dieser Liste gemeint ist. Keine Umbenennung von Datenbankwerten in diesem Auftrag — das wäre
   eine Datenmigration und gehört getrennt entschieden.
4. `check-status-writes` so erweitern, dass ein Schreibhelfer **ohne** Liste selbst ein Verstoß
   ist. Sonst schließt sich dieselbe Lücke beim nächsten neuen Helfer wieder auf.
5. Den Befund aus der Inventur mitnehmen: `beauftragt` wird in `angebote/actions.ts` (~1012) und
   in `handwerker-annahme.ts` geprüft, steht aber in keiner Schreibliste. Prüfen, ob diese
   Prüfungen nach FIX A4 noch gebraucht werden — wenn nicht, entfernen.

**Anhalten.** Commit: `fix(crm): Schreiblisten für Partner- und Nebenstatus`

---

### Teil 2 — Admin hängt an einer eingetippten Mailadresse

Im Rollencheck steht `info@baerenwald-muenchen.de` fest im Code, dazu eine Staging-Adresse.
Wer diese Adresse hat, ist Admin — unabhängig davon, was in der Datenbank steht.

6. Die Adressen aus dem Code entfernen. Die Admin-Eigenschaft kommt ausschließlich aus
   `app_metadata.crm_role` bzw. `is_crm_admin`.
7. Damit sich niemand aussperrt: **vorher** prüfen, ob das Konto hinter dieser Adresse die
   Admin-Kennzeichnung in der Datenbank tatsächlich gesetzt hat. Wenn nicht, den nötigen
   SQL-Befehl ausgeben und **anhalten** — Belal führt ihn aus, erst danach wird der Code
   geändert. Reihenfolge nicht umdrehen.
8. Braucht Staging eine Sonderregelung, dann über eine Umgebungsvariable, nicht über eine
   Adresse im Quelltext. Im Bericht nennen, welche Variable das ist.
9. Guard: `scripts/check-keine-hardcoded-identitaeten.mjs` bricht ab bei einer Mailadresse in
   `src/` außerhalb von Vorlagen und Tests. Vorhandene berechtigte Fälle (Absender, Impressum,
   Kontaktzeilen) mit Begründung auf eine Liste, die nicht wachsen darf.

**Anhalten.** Commit: `fix(crm): Admin-Rolle ohne hardcodierte Mailadresse`

---

## Abnahme

- Jeder Statusschreibhelfer hat eine Liste; `check-status-writes` bricht ab, wenn einer ohne
  Liste hinzukommt
- Keine Mailadresse im Rollencheck
- Der Zugang mit dem Hauptkonto ist vor der Codeänderung nachweislich über die Datenbank
  gesichert (Punkt 7)
- `npx tsc --noEmit` grün

## Bericht

Die abgeleiteten Statuslisten je Bereich mit Herkunft der Werte, das Ergebnis der Prüfung aus
Punkt 7, und der Name der Staging-Variablen aus Punkt 8.
