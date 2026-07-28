# Phase 12 — PDF-Exporte

**Spec:** §16 · Katalog Phase 12

### Abnahmekriterien (vorher definiert)
- [x] Aushang einseitig (Mieter, QR, HV-gebrandet) → Beleg: `aushang-template.ts` (`@page` A4, `max-height: 270mm`); `renderMeldeAushangPdf` mit `preferCSSPageSize` + `displayHeaderFooter: false`; API `GET /api/objekte/[id]/aushang-pdf`
- [x] Regiebericht (Zeit · Tätigkeiten · Material · Fotos · Soll/Ist · §35a) → Beleg: `regiebericht-lebenszyklus-template.ts` + `renderRegieberichtFromLebenszyklus`; API `…/regiebericht-lebenszyklus`
- [x] Bautagebuch zweistufig (Tag → Position) → Beleg: `bautagebuch-lebenszyklus-template.ts` + `renderBautagebuchFromLebenszyklus`; API `…/bautagebuch-lebenszyklus`
- [x] Regie + Bautagebuch aus **einer** Quelle → Beleg: beide rufen `loadBerichtDatenquelle` → `buildBerichtDatenquelle` (Positionseinträge + Tagesspannen/Schichten)
- [x] Angebot/Rechnung §35a / §13b wenn gesetzt → Beleg: `angebot-template.ts` `rechtshinweisePlain`; Rechnung-Payload `hinweis_35a` / Reverse Charge; Muster `rechnung_13b`

### Was sich am Ist geändert hat

| Datei | vorher | nachher | Art |
|---|---|---|---|
| `regiebericht-lebenszyklus-actions.ts` | eigener/älterer Pfad | gemeinsame `loadBerichtDatenquelle` | umgebaut |
| `angebot-template.ts` | §35a nur bei Lohn>0; kein Schluss-Block | §35a bei Flag; `schluss_abrechnung` | erweitert |
| `rechnung-html-payload.ts` / `zahlungsplan.ts` | dünner Schluss | Vorherige Abschläge + Restsumme | erweitert |
| `render-angebot-html-pdf.ts` | nur `footerTemplate` | + `preferCSSPageSize` / Margins / HeaderFooter | erweitert |
| `list-actions.ts` | Export fehlte (Phase 13) | `runDeleteStandaloneRechnung` wiederhergestellt | Fix |

### Neu entstanden
- `aushang-template.ts` · `render-melde-aushang-pdf.ts` · `api/objekte/[id]/aushang-pdf`
- `regiebericht-lebenszyklus-template.ts` · `bautagebuch-lebenszyklus-template.ts`
- `bericht-datenquelle.ts` · `load-bericht-datenquelle.ts`
- `bautagebuch-lebenszyklus-actions.ts` · API `bautagebuch-lebenszyklus`
- Muster-IDs `aushang` / `regiebericht` / `bautagebuch` / `rechnung_13b` in `dokument-pdf-muster.ts`
- `docs/umsetzung/PHASE-12.md`

### Bewusst nicht geändert
- Handwerker-Portal / Schicht-Gate-UI
- Pixel-identischer HTML-1:1-Nachbau der Mock-HTML-Dateien (Angleichung an bestehende Puppeteer-Pipeline)
- CRM-UI-Button „Aushang drucken“ an jedem Objekt (API vorhanden; Einstieg ggf. Objektakte)

### Bekannte Abweichungen / Gaps
- Seitenzahl Aushang: Layout auf eine Seite ausgelegt; physischer Druckdialog-Check nicht automatisiert
- Regiebericht fokussiert eine Position (Regie-first); Sammel-Regie über alle Positionen bleibt Legacy-Pfad
- Kein dedizierter UI-CTA „Bautagebuch PDF“ in Leistungen-Tab (API nutzbar)
- Abnahme-Muster-Meta (`abnahme-protokoll-meta` / Template) mitgezogen für `dokument-pdf-muster` — inhaltlich Phase 8, Commit-Kopplung wegen Muster
