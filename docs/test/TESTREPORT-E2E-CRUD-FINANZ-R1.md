# TESTREPORT — E2E · CRUD · Finanz Runde 1

| Feld | Wert |
|---|---|
| Datum | 2026-08-26 |
| Umgebung | Staging CRM + Website + DB `soqownnkxmtfgvsbrgsl` |
| Auftrag | 3-Ebenen-Plan → Checkliste + Staging-Probe; **Mails nicht prüfen**, **PDFs ja** |
| Checkliste | [`CHECKLISTE-E2E-CRUD-FINANZ.md`](./CHECKLISTE-E2E-CRUD-FINANZ.md) |
| Artefakte | `docs/test/screenshots/pdf-probe/` · `pdf-probe-results.json` · PDFs |

## Kurzfazit

**Noch nicht „alles passt“.** Die große Checkliste steht; Runde 1 hat vor allem **PDF-Routen** und **Melde-Branding** live geprüft. Vollständige 5 Durchläufe + CRUD-Lösch-Session + Finanz-Kette sind **offen** (zu groß für einen Lauf — nächste Session = A2 Kern).

Gesamturteil R1: **GELB** (wie ABNAHME), mit einem **klaren P1-PDF-Bug**.

## Was erledigt ist

1. Master-Checkliste: 5 E2E · CRUD-Matrix · Finanz-Matrix · PDF-Pflichtliste · Reihenfolge
2. PDF-Probe (CRM-Login Staging-Admin)
3. Melde-URLs `/melden/{org_kennung}/{melde_slug}` (Branding ok)
4. Abgleich `ABNAHME.md` (GELB, F-176, A-01, …)

## PDF-Ergebnisse

| Dokument | Erwartung | Ist |
|---|---|---|
| Angebot | öffnet | ✅ beide Routen |
| Rechnung (gesendet) | öffnet | ✅ nur **query**-Route; ❌ **id**-Route |
| Gutschrift | öffnet + Titel | ✅ query; ❌ id (A-01 = id-Route / UI-Fallback) |
| Aushang Leopold | öffnet | ✅ |
| Abnahme-PDF | öffnet | ⬜ noch nicht in R1 |

**P1:** `RechnungDetailClient` / Dokument-Tabs Fallback  
`/api/rechnungen/${id}/pdf` → 400 `Rechnung nicht gefunden`.  
Funktionierende Route: `/api/rechnung-pdf?rechnungId=…` (auch Gutschrift).

## Melde / Branding

| URL | Ergebnis |
|---|---|
| `/melden/staging-muster-nord/staging-leopold-10` | ✅ Funnel + Branding Musterverwaltung Nord |
| `/melden/staging-muster-sued/staging-tegernseer-40` | ✅ Musterverwaltung Süd |
| `/melden/baerenwald-muenchen/haus-muenchen` | ✅ Bärenwald München |
| `/melden/{nur-objekt-slug}` | ❌ Fehlerseite |

## Abdeckung der 3 Ebenen (Stand)

| Ebene | Abdeckung R1 |
|---|---|
| A1 Privatkunde E2E | ⬜ ~5 % (Angebot-PDF Stichprobe) |
| A2 Mieter/HV E2E | ⚠️ ~15 % (Melde-Einstieg + Branding; kein Submit→Abschluss) |
| A3 Partner-Einholung | ⬜ |
| A4 Störfälle/Storno | ⚠️ PDF-Storno-Pfad teilweise (Gutschrift query ok) |
| A5 GPT | ⬜ |
| B CRUD | ⬜ (nur Read/Smoke) |
| C Finanz-Änderungen | ⬜ |

## Nächste Session (Vorschlag)

1. **Fix P1** id-PDF-Route oder UI-Href (dann D2/D3 grün in der UI)
2. **A2 komplett** auf Musterverwaltung Nord + Leopold (Fotos, CRM-Kontext, Freigabe-Gate, Partner erst danach) — ohne Mail-Inhalt, mit Status-PDF am Ende
3. Danach A1 Privat + C Finanz an denselben ZZTEST-Daten
4. Lösch-Session ganz am Ende

## Commit-Vorlage (GitHub Desktop)

- `docs/test/CHECKLISTE-E2E-CRUD-FINANZ.md` — Master-Checkliste E2E/CRUD/Finanz
- `docs/test/TESTREPORT-E2E-CRUD-FINANZ-R1.md` — Runde-1-Report
- `scripts/staging/pdf-probe.mjs` — Staging-PDF-Probe
- `docs/test/pdf-probe-results.json` + Screenshots/PDFs unter `screenshots/pdf-probe/`
