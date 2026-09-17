# TESTREPORT — A2 → A1 → Finanz (Live Staging)

| Feld | Wert |
|---|---|
| Datum | 2026-08-26 |
| Lauf | `scripts/staging/run-a2-a1-finance.mjs` |
| Rohdaten | `docs/test/TESTREPORT-A2-A1-FINANZ-LIVE.json` |
| Screenshots | `docs/test/screenshots/a2-a1-finance/` |
| Mail | nicht geprüft (Catcher) |
| PDFs | geprüft |
| Bilanz | **21 ok · 6 warn · 2 fail** → **GELB** |

Frisch erzeugter A2-Lead: `fe37acab-e6ef-43ad-8bfc-2f72ecf5f5af`  
(`zztest.a2.373963@example.test`, Status `neu`, `hv_meldung_status=neu`, Freigabe `nicht_noetig`, Token `r21GgKaXhOp-rkmMma0L3UeGW5sqBOqz`)

**Nachzug manuell (2026-08-26):** `docs/test/manual-fe37-check.json`

---

## A2 — Mieter über HV

| Schritt | Status | Beobachtung |
|---|---|---|
| Melde Branding | ✅ | „Musterverwaltung Nord“, kein BW-Hero |
| Funnel (Wasser/Küche/>500) | ✅ | Kacheln durchgelaufen |
| Submit / Confirm | ❌ **P1** | Hängt auf „Meldung wird gesendet…“ (F-176). Lead+Token in DB, Mieter sieht weder Ref noch Status-Link |
| Status-Link Branding | ❌ **P1** | kein Link — Folgeschaden F-176 (Token existiert: `/melden/status/r21GgKaX…`) |
| Lead in DB | ✅ | Lead vollständig angelegt (Kontakt, Objekt, Situation, `melde_tracking_token`) |
| CRM Org/Objekt-Kontext | ✅ | Lead im CRM sichtbar |
| Angebot am frischen Lead | ⚠ **Gate, kein Bug** | Kein „Angebot erstellen“ — Primary **„Warte auf HV / Hausmeister“** (`hv_meldung_status=neu`). Erst HV „An Bärenwald übergeben“ → `angebot_eingefordert`. Runner klickte fälschlich Phasen-Zeile `vgp-head` |
| HV-Portal Login | ✅ | Musterverwaltung Nord |
| HV Freigabe-Buttons | ⚠ | Org-Freigabe noch `nicht_noetig` (korrekt ohne Angebot); **HV-Start-Freigabe** am Lead noch offen |
| Partner-Gate-State | ✅ | `nicht_noetig` dokumentiert (Org-Gate greift erst ab Angebot > Schwelle 500 €) |
| Partner-Login | ✅ | Partner-Portal lädt |

**Lesart:** A2 Einstieg (Melde + CRM + Portale) grün/gelb; **F-176 = funktional P1** (nicht nur UI). A2 Mittelteil startet im **HV-Portal**, nicht im CRM-Angebot-Button.

---

## A1 — Privatkunde

| Schritt | Status | Beobachtung |
|---|---|---|
| `/rechner` | ⚠ **Automation** | Landing/Vision; manueller Kurztest blieb vor „Los geht's →“ |
| Rechner → Lead | ⚠ **Automation** | kein neuer Privat-Lead in DB (Lauf + manuell). **Noch kein Produkt-Bug** — Handtest offen |
| Angebot-PDF (Seed) | ✅ | 171 KB |
| Angebot-Detail | ✅ | `40f62e2e` `gesendet_kunde` |
| Auftrag | ✅ | `231716aa` `in_arbeit` |
| Abschluss-PDF | ✅ | 160 KB |
| Privat-Portal Familie Berger | ✅ | Login + Übersicht |

**Lesart:** Portal/PDF/Auftrag an Seed-Daten ok; frischer Rechner→CRM-Lead nicht geschlossen.

---

## C — Finanz-Änderungen

| Schritt | Status | Beobachtung |
|---|---|---|
| RE-PDF Query-Route | ✅ | `STG-R2-0001` ~165 KB |
| RE-PDF id-Route | ❌ | `Rechnung nicht gefunden` (**P1**) |
| RE-Detail | ✅ | Summe sichtbar |
| ⋯ Storno/Gutschrift | ✅ | Menü vorhanden |
| Als bezahlt → Revert | ⚠ **C-Finding** | „Als bezahlt“ ohne Confirm-Dialog. Kein UI-Revert sichtbar; C-Lauf nutzte **SQL**, nicht Produkt. API kann `gesendet` setzen ohne `bezahlt_at` zu leeren → KPI-Risiko |
| Gutschrift-PDF Query | ✅ | ~175 KB |
| Gutschrift-PDF id-Route | ❌ | dieselbe 400 (**A-01/P1**) |
| RE-Entwurf | ✅ | editierbare Oberfläche |
| Zahlplan-Tab am Auftrag | ✅ | Tab/Inhalt erreichbar |
| Aushang-PDF Leopold | ✅ | ~80 KB |

---

## P1 (Priorität)

1. **F-176** Melde-Confirm — Mieter ohne Ref/Status-Link trotz Lead+Token in DB  
2. **PDF id-Route** `/api/rechnungen/{id}/pdf` → 400. Funktionierende Route: `/api/rechnung-pdf?rechnungId=…`

## C-Finding (noch prüfen)

- „Als bezahlt“ ohne Bestätigung; Revert-UI fehlt; Zahlplan/KPI bei Status-Rücknahme

---

## Nächste Schritte (Reihenfolge)

1. **P1 fixen** — F-176 Confirm + PDF id-Route  
2. **A2 Mittelteil** am Lead `fe37acab…`: HV-Portal Start-Freigabe → Angebot **<500 €** (Direkt) **und** **>500 €** (Org-Freigabe) → ablehnen/korrigieren/erteilen → Partner-Gate  
3. **A1:** Rechner manuell durchklicken (Los geht's → Lead in DB?) — Bug vs. Runner  
4. Finanz-Kette: Nachtrag nach Abschlag, Storno-Modi, „Als bezahlt“-Confirm/Revert/Zahlplan

### Commit-Vorlage (GitHub Desktop)

- `scripts/staging/run-a2-a1-finance.mjs` — Staging-Runner A2→A1→C  
- `docs/test/TESTREPORT-A2-A1-FINANZ-LIVE.md` — dieser Report  
- `docs/test/TESTREPORT-A2-A1-FINANZ-LIVE.json` — Rohbilanz  
- `docs/test/screenshots/a2-a1-finance/` — Screenshots + PDFs  
- `docs/test/CHECKLISTE-E2E-CRUD-FINANZ.md` — Session-Log ergänzt  
- `docs/test/manual-fe37-check.json` — manueller Lead-/Rechner-/RE-Check  
- `docs/test/screenshots/manual-fe37/` — Screenshots manueller Prüfung  
- `docs/test/CHECKLISTE-REALISTISCH-STATUS.md` — F-176 P1, Automation vs. Produkt, HV-Gate geklärt  
