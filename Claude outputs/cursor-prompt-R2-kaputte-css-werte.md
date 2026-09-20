# Cursor-Prompt R2 — 51 stillschweigend kaputte CSS-Werte reparieren

Kopiere alles ab der Trennlinie in Cursor. Eigener Branch, eigener Commit, nach R1.

---

## Auftrag R2: Verunglückte px→rem-Umstellung reparieren (51 Deklarationen, 21 Dateien)

**Befund, nicht verhandelbar.** Im CRM stehen 51 Inline-Style-Deklarationen mit doppeltem
`rem`-Suffix. Jede einzelne dieser Deklarationen wird vom Browser **stillschweigend verworfen** —
kein Fehler, kein Warning, kein Typfehler, weil es Strings sind. Folge im Livebetrieb: fehlende
Rahmen, fehlende Innenabstände, Texte, die ohne Box direkt auf dem Hintergrund liegen. Das ist
einer der Gründe, warum die Oberfläche auf dem Telefon „aus den Karten läuft".

Ursache ist eine fehlerhafte Suchen-und-Ersetzen-Umstellung von `px` auf `rem`: das Muster hat
innerhalb von `0.5px` den Teil `5px` getroffen, durch `0.3125rem` ersetzt und den Rest stehen
gelassen. Deshalb sieht der Schaden so aus: `0.5px` → `0.0.3125remrem`.

Im Portal-Repo (`baerenwald`) existiert der Schaden **nicht** — dort nichts ändern.

### Teil 1 — Werte korrekt zurücksetzen

Diese Zuordnung ist hergeleitet und gilt. Nicht raten, nicht abweichen:

| kaputt | Anzahl | ursprünglich | korrekt |
|---|---|---|---|
| `0.0.3125remrem` | 19 | `0.5px` | `0.03125rem` |
| `0.6250remrem` | 11 | `10px` | `0.625rem` |
| `0.8750remrem` | 8 | `14px` | `0.875rem` |
| `0.1250remrem` | 4 | `2px` | `0.125rem` |
| `0.0625remrem` | 4 | `1px` | `0.0625rem` |
| `0.3750remrem` | 3 | `6px` | `0.375rem` |
| `1.0.3125remrem` | 1 | `1.5px` | `0.09375rem` |
| `6.8750remrem` | 1 | `110px` | `6.875rem` |

Betroffene Dateien (alle unter `src/components/`):
`auftraege/AuftragAbnahmeprotokollCard.tsx` (7), `rechnungen/RechnungWizard.tsx` (7),
`posboard/PosTable.tsx` (5), `posboard/PosBoard.tsx` (3), `posboard/PosTotals.tsx` (2),
`rechnungen/RechnungWizardMailPreview.tsx` (2), `rechnungen/RechnungKorrekturKetteCard.tsx` (2),
`objektakte/ObjektEinheitenSection.tsx` (2), `kunden/KundeDetailClient.tsx` (2),
`angebote/AngebotWizardMailPreview.tsx` (2), `angebote/AngebotWizard.tsx` (2),
`ui/confirm-kunde-delete.tsx` (1), `rechnungen/RechnungWizardPdfPreview.tsx` (1),
`rechnungen/RechnungKorrekturWahlModal.tsx` (1), `kunden/KundenOrganisationTab.tsx` (1),
`formulare/DokumentPdfVorlagenSection.tsx` (1), `crm/KundenportalLinkVersendenModal.tsx` (1),
`crm/AnlageTeilPicker.tsx` (1), `angebote/AngebotWizardPdfPreview.tsx` (1),
`anfragen/AnfrageNotizenTab.tsx` (1), `anfragen/AnfrageLeadTabsShared.tsx` (1).

1. Alle 51 Vorkommen gemäß Tabelle ersetzen. Danach muss
   `grep -rn "remrem" src/` **null** Treffer liefern.
2. **Wichtig bei den 19 Rahmen mit `0.5px`:** Wenn an der Stelle ein Rahmen in
   `var(--border)` gesetzt wird, nutze stattdessen die vorhandene Kanon-Fläche
   (`MockCard` bzw. die bestehende Rahmen-Klasse aus `src/styles/mock-design-system.css`) und
   entferne den Inline-Style ganz. Nur wo das den Aufbau des Screens verändern würde, bleibt der
   Inline-Style mit dem korrigierten Wert stehen. Zähle im Bericht, wie viele der 19 du auf die
   Kanon-Klasse umgestellt hast und wie viele nicht — mit Begründung je Datei.
3. `PosTable.tsx` Zeile ~69: dort steht neben dem kaputten Rahmen `width: 17, height: 17,
   borderRadius: 4` als rohe Zahlen. Das ist eine handgebaute Checkbox. Ersetze sie durch
   `MockCheckbox`, wenn die Semantik identisch ist; falls nicht, nur den Rahmenwert korrigieren und
   das im Bericht als bewusst offen vermerken.

### Teil 2 — Guard, damit das nicht wiederkommt

Der Schaden ist ausschließlich deshalb monatelang unentdeckt geblieben, weil TypeScript, ESLint und
die Tests CSS-Werte in Strings nicht prüfen. Das wird jetzt geschlossen.

4. Neues Skript `scripts/check-inline-css-werte.mjs`. Es liest alle `.ts`/`.tsx` unter `src/`,
   sucht Zuweisungen an CSS-Eigenschaften in Objektliteralen
   (`border`, `borderTop/Bottom/Left/Right`, `borderRadius`, `padding*`, `margin*`, `gap`,
   `rowGap`, `columnGap`, `fontSize`, `lineHeight`, `width`, `minWidth`, `maxWidth`, `height`,
   `minHeight`, `maxHeight`, `top`, `left`, `right`, `bottom`, `inset`, `flexBasis`,
   `letterSpacing`, `boxShadow`) mit **String-Literal** als Wert und bricht ab bei:
   - doppeltem Einheitensuffix (`remrem`, `pxpx`, `emem`, `%%`)
   - mehr als einem Dezimalpunkt in einer Zahl (`0.0.3125`)
   - einem Zahlentoken ohne bekannte Einheit (erlaubt: `px rem em % vh vw dvh svh ch fr mm s ms deg`,
     außerdem `0`)
   - unbalancierten Klammern in `calc(` / `var(` / `min(` / `max(` / `clamp(` / `env(`
   Template-Literale mit `${…}` werden geprüft, indem die Ausdrücke vorher durch `1px` ersetzt
   werden — damit fallen echte Einheitenfehler auf, ohne dass berechnete Prozentwerte melden.
   Keine Allowlist anlegen. Wenn eine Stelle wirklich meldet, ist sie zu korrigieren, nicht
   freizustellen.
5. Skript in `package.json` als `check:css-werte` und in die bestehende Guard-Kette vor
   `npm run build` einhängen — dieselbe Stelle wie die übrigen `scripts/check-*.mjs`.
6. Dasselbe Skript und denselben Guard **auch** im Portal-Repo (`baerenwald`) einhängen. Dort sind
   heute null Treffer; der Guard hält es so.

### Abnahme

- `grep -rn "remrem" src/` → 0 Treffer im CRM.
- `node scripts/check-inline-css-werte.mjs` → grün in beiden Repos.
- Der Guard schlägt nachweislich an, wenn man testweise `border: '0.0.3125remrem solid red'`
  irgendwo einfügt (kurz gegenprüfen, nicht nur behaupten).
- `npx tsc --noEmit` und `npm run build` grün in beiden Repos.
- Sichtprüfung auf dem Telefon in genau diesen vier Ansichten, weil dort der Schaden sichtbar war:
  Kunden-Detail (Karte „Verknüpft mit Objektakte"), Angebots-Wizard, Rechnungs-Wizard,
  Positionsliste (PosBoard/PosTable). Jede Karte hat wieder Rahmen und Innenabstand.

### Bericht

In den Commit-Text und nach `docs/TODO-ENTWICKLUNG.md`: Anzahl ersetzter Werte pro Datei, wie viele
Inline-Rahmen auf die Kanon-Klasse umgestellt wurden, Entscheidung zu `PosTable` und der Name des
neuen Guards. Kein Häkchen in `audit-status.mjs`, das der Guard nicht selbst messen kann.
