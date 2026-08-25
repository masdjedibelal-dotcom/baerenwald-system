# TESTREPORT-ETAPPE-2 — Dokumente & PDFs

| Feld | Wert |
|---|---|
| Etappe | 2 — Dokumente & PDFs |
| Datum | 2026-08-25 |
| Umgebung | Staging CRM `staging--baerenwald-backend.netlify.app` · Website `staging--baerenwald.netlify.app` · Supabase `soqownnkxmtfgvsbrgsl` |
| Ergebnis | **1 ✅ · 4 ❌ · 3 ⚠️ · 5 🚫** von 13 (Live) · Rest Code-Befund |
| Mail-STOPP | Weiter aktiv — kein „Senden/Versenden“, keine Partner-Notify, keine Storno-Mail-Flows |
| Seed-Lage | 0 Aufträge · 0 Rechnungen · 1 Angebots-Entwurf (leer) · Aushang-PDFs verfügbar |
| PDFs/Screenshots | `docs/test/screenshots/etappe-2/` |
| Fund-IDs | fortlaufend ab **F-027** |

---

## Kurzüberblick

1. **Angebot-PDF live prüfbar** (Entwurf Maria Koch): öffnet, Umlaute ok, **Datum `18.8.2026` ohne Nullpadding**, leere Positionen → **2 Seiten** mit wenig Inhalt / Footer-Drift.
2. **Aushang-PDF live**: QR-URL korrekt und live erreichbar; Org-Name ok; **Farbe hardcodiert `#22508C`**; Zeile **„Partner: Bärenwald München.“**
3. **Rechnung/Storno/Gutschrift/Abnahme/Abschluss/Vertrag**: Staging ohne Aufträge/Rechnungen + Mail-STOPP → überwiegend **🚫 / Code-⚠️**.
4. **Code-Befund Gutschrift**: aktives HTML-PDF ohne Titel „Gutschrift“ und ohne Original-Bezug (Legacy-Renderer ungenutzt).
5. **Nummernkreis (Code)**: Nummer erst beim Versand; Entwurf löschen = kein Loch.

---

## Ergebnisse je Testfall

### F-027 · T-PDF-01 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | CRM Staff · `/api/angebot-pdf?angebotId=6d099c2a-…` (+ HTML-Preview) |
| Screenshot/PDF | `T-PDF-01-angebot-entwurf-maria-koch.pdf` |
| Erwartet | Fehlerfrei, Umlaute, Centbeträge = CRM, BW-Branding, TT.MM.JJJJ, MwSt/Gültigkeit/Positionen |
| Beobachtet | PDF öffnet (`%PDF`, 156 KB, 2 Seiten). Branding BW Staging. **MwSt 19 %**, **gültig bis** vorhanden. Geld `0,00 €`. Umlaute („Grüßen“) ok. **Keine Positionen** (leerer Entwurf). **Datum `18.8.2026` / `24.9.2026`** — nicht `18.08.2026`. Seite 2 weitgehend Signatur/Footer (wenig Inhalt). Wizard an Familie Berger geöffnet, Speichern mit ZZTEST-Positionen in dieser Runde nicht abgeschlossen. |
| Einordnung | Neuer Fund (Datumsformat) · Datenlage Entwurf schwach |

**Standard-Checks:** Öffnet ✅ · Leere/dünne Seiten ⚠️ · Umlaute ✅ · Beträge=CRM (0€) ✅ · Branding BW ✅ · Datum ❌ Padding · Geldformat ✅

---

### F-028 · T-PDF-02 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Staging **0 Aufträge / 0 Rechnungen**. Abschlag nur über Auftrag→Zahlplan. Mail-STOPP: Versand (Nummernvergabe) vermieden. |
| Code | Titel `Abschlagsrechnung N` in `angebot-template.ts`; Meta Fälligkeit/MwSt vorhanden. |
| Einordnung | Seed + Mail-STOPP |

---

### F-029 · T-PDF-03 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Keine Schlussrechnung ohne Auftrag/Abschläge. |
| Code | `Schlussrechnung` + Abzugsblock `schluss_abrechnung` in Payload. |
| Einordnung | Seed |

---

### F-030 · T-PDF-04 · ⚠️ Teilweise (Code + Firmenfuß live am Angebot) · Wichtig

| Feld | Inhalt |
|---|---|
| Erwartet | Anbieterdaten, fortlaufende Nr., Daten, Netto/MwSt/Brutto, USt-ID oder Steuernr. |
| Beobachtet | Am live Angebot-PDF: Name/Adresse/Tel/Mail, USt-IdNr. + Steuernummer (Staging-Platzhalter `DE000000000` / `000/000/00000`), Angebotsnr. `AG6D099C2A`. **Keine Rechnungsnummer** (anderes Dokument). Rechnung-Pflichtgate: `rechnung-validierung.ts`. Footer-Defaults hardcodiert wenn Firma leer (`angebot-template.ts`). |
| Einordnung | Neuer Fund (Platzhalter-/Default-Steuernummern) |

---

### F-031 · T-PDF-05 · ⚠️ Teilweise (nur Code) · Wichtig

| Feld | Inhalt |
|---|---|
| Erwartet | Dokumentieren: Nummernloch bei Entwurf löschen? |
| Beobachtet | **Code:** Nummer erst bei Versand (`next-rechnungsnummer.ts`, Migration `belegnummer_erst_bei_versand`). Entwürfe `rechnungsnummer: null` → Löschen eines Entwurfs **kein Loch**. Löschen einer **bereits nummerierten** RE erzeugt Lücke (Max+1). Live nicht ausgeführt (keine Rechnungen / Mail-STOPP bei Versand). |
| Einordnung | Für Berater: Policy „kein Loch bei Entwurf“ im Code; Loch möglich bei Löschen nummerierter Belege |

---

### F-032 · T-PDF-06 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Storno/Ersatz braucht gesendete Rechnung; Versand = Mail-Risiko. |
| Code-Befund | DB `bezug_rechnung_id` / Mail nennen Korrektur. **Aktives HTML-PDF übergibt Bezug nicht** (`persist-pdf.ts` lädt `bezugNr`, Renderer nutzt es nicht). |
| Einordnung | Mail-STOPP + bekannte PDF-Lücke |

---

### F-033 · T-PDF-07 · ❌ Fehlgeschlagen (Code) · Wichtig

| Feld | Inhalt |
|---|---|
| Erwartet | Gutschrift: Negativbeträge; Kennzeichnung |
| Beobachtet | Live nicht erzeugbar. **Code:** `beleg_typ: 'gutschrift'` in DB; HTML-PDF-Titel bleibt „Rechnung“, kein Gutschrift-Titel, kein Bezug. Legacy `rechnung-pdf.tsx` hätte „GUTSCHRIFT“ — ungenutzt. |
| Einordnung | Neuer Fund |

---

### F-034 · T-PDF-08 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Abnahme-Wizard braucht Auftrag. Staging 0 Aufträge. |
| Code | Template: „Es wurden keine Mängel festgestellt.“ Branding BW. |
| Einordnung | Seed |

---

### F-035 · T-PDF-09 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Kein Auftrag für Abnahme mit Mängeln. |
| Code | Mängelliste + `regeneratePdf` bei Update in `abnahmeprotokoll-actions.ts`. Portal-Version live nicht geprüft. |
| Einordnung | Seed |

---

### F-036 · T-PDF-10 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Abschlussdokumentation an Auftrag gebunden — keine Aufträge. |
| Code | `render-abschlussdokumentation-pdf.ts` BW-HTML. |
| Einordnung | Seed |

---

### F-037 · T-PDF-11 · ✅ Bestanden (mit bekannten Abweichungen als Funde) · —

| Feld | Inhalt |
|---|---|
| Rolle + URL | CRM · `GET /api/objekte/5de631be-…/aushang-pdf` |
| PDF | `T-PDF-11-aushang-objekt.pdf` |
| Erwartet | QR → `/melden/[org]/[objekt]`; Org-Branding; Partner-Zeile laut Leitfaden |
| Beobachtet | 1 Seite, öffnet. Text: Musterverwaltung Nord, Objekt WEG Leopold 10, Adresse Leopoldstraße 10 · 80802 München. **URL im PDF:** `https://staging--baerenwald.netlify.app/melden/staging-muster-nord/staging-leopold-10` — HTTP **200**, Org-UI. **Partner: Bärenwald München.** Farbe Code `#22508C` (nicht `org_primary_color`; Spalte bei HVs oft null). Umlaute (Straße, öffnet) im Render; Extrakt zeigt teils Ligaturen. |
| Einordnung | Kernziel QR ✅ · F-038/F-039 Abweichungen |

Zusatzfunde Aushang:

### F-038 · T-PDF-11 Farbe · ❌ · Kosmetik/Wichtig

| Feld | Inhalt |
|---|---|
| Beobachtet | `render-melde-aushang-pdf.ts` setzt `primaryColor: '#22508C'` hardcodiert — Org-Primärfarbe wird nicht gelesen. |
| Einordnung | Neuer Fund |

### F-039 · T-PDF-11 Partner-Zeile · ⚠️ · Kosmetik

| Feld | Inhalt |
|---|---|
| Beobachtet | Footer hardcodiert „Partner: Bärenwald München.“ — bekannt laut UI-Audit; hier als Fund für Leitfaden-Abgleich belassen. |
| Einordnung | Bekannt (Audit) / DSB-Hinweis |

---

### F-040 · T-PDF-12 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Vertrag-Wizard an Auftrag — keine Aufträge. |
| Code | `vertrag-pdf.tsx` `@react-pdf`, immer BW als Auftraggeber. |
| Einordnung | Seed |

---

### F-041 · T-PDF-13 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Erwartet | Privat = BW; HV/Mieter-gerichtet = Org; kein BW-Grün-Fallback bei Org-Farbe |
| Beobachtet | **Privat-Angebot (Maria Koch):** BW-Branding ✅. **HV-Aushang (Muster Nord):** Org-Name/Objekt ✅, Farbe **nicht** Org (Blau hardcodiert) ❌, Partner-Zeile BW ⚠️. Abnahme/Rechnung-Whitelabel live nicht vergleichbar (keine Aufträge). Alle Angebots-/Rechnungs-/Vertrags-PDFs laut Code **immer BW**. |
| Einordnung | Neuer Fund (Aushang-Farbe) · strukturell: Transaktions-PDFs ohne Org-WL |

---

## Standard-Prüfungen (übergreifend)

| Kriterium | Live belegt an |
|---|---|
| Öffnet fehlerfrei | Angebot ✅ · Aushang ✅ |
| Keine leeren/abgeschnittenen Seiten | Angebot ⚠️ (2. Seite dünn) · Aushang ✅ |
| Umlaute äöüß€ | Angebot ✅ · Aushang ✅ (Straße) |
| Beträge = CRM | nur 0€-Fall |
| Branding Mix | Aushang Mischform (Org+Partner-BW) |
| Datum TT.MM.JJJJ | Angebot ❌ (`18.8.2026`) |
| Geld 1.234,56 € | `0,00 €` Format ok |

---

## ZZTEST-Entitäten

| Entität | ID/Name | Anmerkung |
|---|---|---|
| Kunde | `ZZTEST-Privat Berger` (`ea7e8163-…`) | Angelegt (Agent/CRM); kein vollständiges Angebot daran abgeschlossen |
| Objekt-Aushang | Seed `WEG Leopold 10` | PDF erzeugt, kein ZZTEST-Rename (Seed nicht umbenannt) |
| Angebot-PDF | Maria Koch Entwurf `6d099c2a-…` | bestehend, kein ZZTEST-Titel |

Keine Aufträge/Rechnungen/Abnahmen ZZTEST (blockiert).

---

## Für den Datenschutzberater / Finanz-Hinweis

| ID | Thema |
|---|---|
| F-031 | Nummern: Entwurf löschen kein Loch; nummerierte löschen → Loch möglich |
| F-033 / F-032 | Gutschrift/Storno-PDF ohne klaren Bezugstitel im aktiven Renderer |
| F-030 | Staging-Firmenfuß mit Platzhalter-USt/`000`-Steuernummer |
| F-039 | Aushang nennt „Partner: Bärenwald München“ gegenüber Mietern |

---

## Blocker für Nacharbeit

1. **Mail-Catch** auf Staging (Etappe 0) — Versand für echte Nummern/Storno/Portal-Sync.  
2. **Seed/Flow:** mindestens 1 ZZTEST-Auftrag mit Zahlplan, Abnahme, Vertrag.  
3. Angebot-Wizard bis Speichern mit Positionen inkl. Umlaute/Cent nachholen.  
4. QR zusätzlich mit Handy/Decoder scannen (URL textlich + HTTP belegt).

---

## Commit-Vorlage (GitHub Desktop)

- `docs/test/TESTREPORT-ETAPPE-2.md` — Report Etappe 2 PDFs inkl. Code-Befunde und DSB-Hinweise  
- `docs/test/screenshots/etappe-2/T-PDF-01-angebot-entwurf-maria-koch.pdf` — live Angebot-PDF  
- `docs/test/screenshots/etappe-2/T-PDF-11-aushang-objekt.pdf` — live Aushang Leopold 10  
- `docs/test/screenshots/etappe-2/T-PDF-00-*.png` — Setup-/Wizard-Zwischenschritte  
