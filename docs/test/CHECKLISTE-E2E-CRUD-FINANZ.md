# Checkliste — E2E · CRUD · Finanz (Staging)

| Feld | Wert |
|---|---|
| Umgebung | CRM `https://staging--baerenwald-backend.netlify.app` · Website `https://staging--baerenwald.netlify.app` · DB `soqownnkxmtfgvsbrgsl` |
| Regel | **Nur Staging.** Prod = read-only / kein Schreib-Test. |
| Mail | **Nicht prüfen** (Catcher reicht; kein Resend-Inhalt-Review). |
| PDFs | **Immer prüfen** (öffnet, Titel, Summen, Branding, keine 404). |
| Testdaten | Prefix `ZZTEST-E2E-…` / Seed Muster* — am Ende soft-löschen wo möglich |
| Status-Legende | ⬜ offen · ▶️ läuft · ✅ ok · ⚠️ teilweise · ❌ fail · ⏭️ blockiert/n.a. · 📌 bekannt (ABNAHME) |

Pro Schritt Kopf-Checks: **(S)** gleiche Geschichte · **(M)** Notify ausgelöst (nur Log/Catch, Inhalt egal) · **(B)** Branding/Whitelabel · **(P)** PDF

Bezug Vorarbeit: `docs/test/ABNAHME.md` (Stand 2026-08-26, Gesamturteil **GELB**).

---

## A — Fünf End-to-End-Durchläufe

### A1 — Privatkunde über Website

| # | Schritt | S | M | B | P | Status | Notiz |
|---|---|---|---|---|---|---|---|
| A1.1 | Rechner klassisch → Lead im CRM | | | | — | ⬜ | |
| A1.2 | Angebot-Wizard → PDF-Vorschau | | | | ✓ | ⬜ | |
| A1.3 | Angebot senden (Catcher) | | ✓ | | ✓ | ⬜ | Mail-Inhalt skip |
| A1.4 | Kunde annimmt (Portal/Projekt-Link) | ✓ | ✓ | | | ⬜ | |
| A1.5 | Auftrag entsteht nur aus Annahme | ✓ | | | | ⬜ | kein FAB-Auftrag-Bypass |
| A1.6 | HW zuweisen & senden | ✓ | ✓ | | | ⬜ | |
| A1.7 | Abnahme-Wizard → Abnahme-PDF | ✓ | | | ✓ | ⬜ | |
| A1.8 | Rechnung → bezahlt | ✓ | ✓ | | ✓ | ⬜ | |

### A2 — Mieter über HV (Kern B2B) — höchste Prio

| # | Schritt | S | M | B | P | Status | Notiz |
|---|---|---|---|---|---|---|---|
| A2.1 | HV + Objekt + Melde-Link anlegen | | | | ✓ Aushang | 📌 | Seed Musterverwaltung; Melde-Confirm flaky **F-176** |
| A2.2 | Mieter `/melden/…` + Fotos | | ✓ | ✓ | — | ⚠️ | Funnel ok, Confirm-UI unzuverlässig (ABNAHME) |
| A2.3 | Status-Link Whitelabel | ✓ | | ✓ | — | ⚠️ | Org-Farbe oft null (R-12) |
| A2.4 | CRM: Org-/Objekt-Kontext | ✓ | | | — | ✅ | ABNAHME .2 |
| A2.5 | Freigabe HV-Portal (Gate blockiert Partner) | ✓ | ✓ | | — | ⚠️ | Label ✅; Live ablehnen/erteilen seed-abhängig |
| A2.6 | Partner-Versand erst nach Freigabe | ✓ | ✓ | | — | ⬜ | Gate hart prüfen |
| A2.7 | Terminvorschlag → Mieter bestätigt | ✓ | ✓ | | — | ⬜ | |
| A2.8 | Erledigt + Feedback + Abnahme-PDF Status | ✓ | ✓ | ✓ | ✓ | ⏭️ | hing an .3–.11 |

### A3 — Partner-Einholung

| # | Schritt | Status | Notiz |
|---|---|---|---|
| A3.1 | Partner-Anfrage Token | ⚠️ | Automation Partner-Login flaky (R-10) |
| A3.2 | HW annimmt + Preis/PDF | ⬜ | PDF Partner-Einreichung |
| A3.3 | CRM: EK übernehmen → Kundenangebot | ⬜ | Marge/VK |

### A4 — Störfälle laufender Auftrag

| # | Schritt | Status | Notiz |
|---|---|---|---|
| A4.1 | Nachtrag → `/nachtrag/[token]` | ⏭️ | hing an Auftrag-Pfad |
| A4.2 | Baustopp an/aus | ⬜ | Status überall |
| A4.3 | AG-Korrektur | ⏭️ | |
| A4.4 | RE-Storno: Ersatz / Gutschrift / ohne | 📌 | **A-01** Gutschrift-PDF-API 404 |

### A5 — BärenwaldGPT-Weg

| # | Schritt | Status | Notiz |
|---|---|---|---|
| A5.1 | Chat + Viz → Preisrahmen → Lead CRM | ⬜ | Staging-Deploy/Feature prüfen |

---

## B — CRUD-Matrix Stammdaten

Muster: **Neu → Bearbeiten (mitten im Prozess) → Nutzen → Löschen (Verknüpfungen!)**

| Objekt | Neu | Edit mid-process | Nutzen | Löschen-Risiko | Status |
|---|---|---|---|---|---|
| Kunde Privat/Gewerbe/HV | ⬜ | ⬜ | Vorgang | offene Vorgänge, Merge | ⬜ |
| Objekt | ⬜ | Adresse bei offener Meldung | Melde-Link/QR/Aushang-PDF | aktive Links/Meldungen | ⬜ |
| Einheit | ⬜ | ⬜ | Mieter-Zuordnung | Einladungen | ⬜ |
| Org-Einstellungen | ⬜ | Logo live Status-Seite; Schwelle Gate | Freigabe | Kennung → alte URLs? | ⚠️ Label Freigabe ✅ |
| Handwerker | ⬜ | Konditionen bei Zuweisung | Portal | Aufträge/Sperrhinweis | ⬜ |
| Preislisten | ⬜ | ⬜ | Wizard | offene Angebote | ⬜ |
| Termin / To-do | ⬜ | ⬜ | Lead/Auftrag | — | ⚠️ Termin-Mail default aus ✅ |
| Team-User | ⬜ | ⬜ | Login | — | ✅ Staff2 Smoke |

**Pipeline:** Duplizieren, Mehrfach-Löschen, CSV, Storno — ⬜ / CSV R-05 ✅

**Auftrag intern:** PosBoard ± · HW-Tausch · Bautagebuch · Akte Docs/Notizen — ⏭️/.7 offen

**Portale:**

| Portal | Checks | Status |
|---|---|---|
| HV | Objekt/Einheiten/Einladung/Team/WL/Freigabe | ⚠️ Login ✅; Abnahme-Karte seed ⚠️ |
| Partner | Firmendaten, Compliance-Docs, Planer | ⚠️ Login flaky |
| MeinBärenwald | Konto/Notify-Settings | ⬜ |

---

## C — Finanz-Änderungsmatrix (eigene Session)

Prinzip: **Stimmen die Summen überall?** CRM-Liste · Detail · Zahlplan · PDF · Portal · `/projekt/[token]`

### C1 Angebot

| Situation | Erwartung | Status |
|---|---|---|
| Entwurf edit | PDF aktualisiert | ⬜ |
| Gesendet, Kunde offen | Alt = ersetzt; Kunde sieht nicht still alte | ⬜ |
| Angenommen | nur AG-Korrektur-Wizard | ⏭️ |
| Partner-EK ändert | VK/Marge nachgezogen | ⬜ |
| Abgelaufen | Annahme blockiert | ⬜ |

### C2 Auftrag / Positionen

| Situation | Status |
|---|---|
| PosBoard ± bei zugewiesenem HW (Portal-Wert?) | ⬜ |
| HW-Tausch (alter HW weg?) | ⏭️ |
| Nachtrag → Auftrag + Zahlplan | ⏭️ |
| Baustopp | ⬜ |

### C3 Zahlungsplan

| Situation | Status |
|---|---|
| Raten vor erstem Versand | ⬜ |
| Raten nach gesendetem/bezahltem Abschlag | ⬜ |
| Nachtrag nach bezahltem Abschlag (krumme Beträge) | ⬜ |
| Schluss zieht Abschläge ab | ⬜ |

### C4 Rechnung

| Situation | Status |
|---|---|
| Entwurf edit + PDF | ⬜ |
| Gesendet nicht mehr editierbar | 📌 F-160 title fehlt |
| Storno Ersatz / Gutschrift / ohne | 📌 A-01 Gutschrift-PDF 404 |
| Bezahlt + stornieren | ⬜ |
| Mahnung/Erinnerung | ✅ Modal ABNAHME |
| Eingangsrechnung Partner | ⬜ |

---

## D — PDF-Pflichtliste (diese Session)

| PDF | Quelle | Erwartung | Status |
|---|---|---|---|
| D1 Angebot | `/api/…` oder UI-Download | öffnet, Summen=CRM, TT.MM.JJJJ | ⬜ |
| D2 Rechnung | dito | dito | ⬜ |
| D3 Gutschrift/Storno | dito | Titel korrekt, kein 404 | 📌 A-01 |
| D4 Abnahme | Auftrag/Status | öffnet | ⬜ |
| D5 Aushang/QR | Org-Objekt | QR-URL staging, Branding | ⬜ |
| D6 Partner-Einreichung | Portal/CRM | öffnet | ⬜ |

---

## E — Ausführungsreihenfolge (empfohlen)

1. **Seed/CRUD-Setup** HV + Objekt + Einheiten + Partner + Privatkunde (`ZZTEST-E2E-*`)
2. **A2** komplett (Kern)
3. **A1** + **A3**
4. **C** Finanz-Änderungen an den frischen Daten (krumme Beträge)
5. **A4** Störfälle
6. **B Löschen**-Session am Ende
7. **A5** GPT separat

Runde 2: nur Rote/Gelbe + immer A2 nochmal.

---

## F — Session-Log (wird fortgeschrieben)

| Datum | Was | Ergebnis |
|---|---|---|
| 2026-08-26 | ABNAHME A–E | **GELB** — siehe `ABNAHME.md` |
| 2026-08-26 | Checkliste angelegt | Struktur komplett |
| 2026-08-26 | PDF-Probe + Melde-Smoke | siehe `TESTREPORT-E2E-CRUD-FINANZ-R1.md` |
| 2026-08-26 | A2→A1→Finanz Live | **21✅ 6⚠️ 2❌** — `TESTREPORT-A2-A1-FINANZ-LIVE.md`; Lead `fe37acab-…`; P1 PDF-id-Route bestätigt; A2-Freigabe-Mittelteil offen (kein Angebot>500) |

### F1 PDF-Probe (R1, Mail skip)

| ID | Route | Ergebnis |
|---|---|---|
| D1 Angebot | `/api/angebote/{id}/pdf` + query | ✅ ~171 KB PDF |
| D2 Rechnung | `/api/rechnung-pdf?rechnungId=` | ✅ ~165–179 KB |
| D2′ Rechnung | `/api/rechnungen/{id}/pdf` | ❌ `"Rechnung nicht gefunden"` (UI-Fallback!) |
| D3 Gutschrift | query-Route | ✅ ~175 KB |
| D3′ Gutschrift | id-Route | ❌ dieselbe 400-Meldung (**A-01** präzisiert) |
| D5 Aushang | `/api/objekte/{id}/aushang-pdf` | ✅ ~80 KB |
| A2 Melde Branding | `/melden/{org}/{objekt}` | ✅ MN/MS/BM Whitelabel sichtbar |
| A2 falscher Pfad | `/melden/{slug-only}` | ✔ | Fehlerseite „Link nicht verfügbar“ ist **Soll** — Pfad braucht immer Org-Kennung + Objekt-Slug |

**Kernfund R1:** UI verlinkt oft `/api/rechnungen/{id}/pdf` → kaputt. Wizard/Preview nutzt `/api/rechnung-pdf?…` → ok. Fix: Fallback-Href vereinheitlichen **oder** id-Route reparieren.
