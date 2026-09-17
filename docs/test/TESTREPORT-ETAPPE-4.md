# TESTREPORT-ETAPPE-4 — Katalog C (Auftrag) + D (Rechnung)

| Feld | Wert |
|---|---|
| Etappe | 4 — Katalog C (Auftrag) + D (Rechnung) |
| Datum | 2026-08-25 |
| Umgebung | Staging CRM `staging--baerenwald-backend.netlify.app` · Website `staging--baerenwald.netlify.app` · Supabase `soqownnkxmtfgvsbrgsl` |
| Ergebnis | **2 ✅ · 2 ❌ · 6 ⚠️ · 11 🚫** von 21 |
| Mail-STOPP | Weiter aktiv — kein Rechnung/Partner/Nachtrag-Versand |
| Screenshots | `docs/test/screenshots/etappe-4/` |
| Fund-IDs | fortlaufend ab **F-069** |
| Basisdaten | ZZTEST aus Etappe 3, v. a. Auftrag `11209afb-…` (Berger) |
| Setup | `docs/test/TESTPLAN-SETUP.md` |

---

## Kurzüberblick

1. **Ein brauchbarer Auftrag:** `11209afb-…` „Sanitär — ZZTEST-Privat Berger“ — Position „Türöffnung“ 1.324 € netto / 1.575,56 € brutto; **kein Partner** (`handwerker_id=null`); mehrere **Rechnungs-Entwürfe** (Abschlag/Schluss/Voll/Gutschrift), alle `rechnungsnummer=null`.
2. **Während der Etappe:** Auftrag von `offen` → **`abgeschlossen` / Fortschritt 100** (vermutlich „Auftrag abschließen“; nicht bewusst als Testziel). CRM und Projekt-Link zeigen danach beide „Abgeschlossen“.
3. **T-C11:** Projektseite lebt auf **CRM-Domain** `/projekt/[token]`. Auf der **Website**-Domain → Marketing-**404**.
4. **Partner-/Nachtrag-/Abnahme-/Eingangsrechnung-Fälle** überwiegend 🚫 (keine Zuweisung, 0 Baustopps, 0 Eingangsrechnungen, Mail-STOPP, Auftrag inzwischen abgeschlossen).
5. **T-C04 Ablehnen-Button:** Code bestätigt nur „Ich stimme dem Nachtrag zu“ — **kein Ablehnen** = Bekannt (Backlog) ✅.

---

## ZZTEST / genutzte IDs

| Typ | Hinweis | ID |
|---|---|---|
| Auftrag | ZZTEST-Privat Berger · zuletzt `abgeschlossen` | `11209afb-f290-4ed3-94ef-8282aafec532` |
| Kunden-Token | Projekt-Link | `2d36e9916d80244514df3eef7d7edfb027056dc3d3e9f43c28b7e1be22d967d9` |
| Kunde | ZZTEST-Privat Berger | `ea7e8163-a0ea-4ab5-b8dc-3e147798c7c9` |
| Lead | Berger-Pfad | `3ee5106d-8ad7-4f66-b3a5-6fe4af7cfda5` |
| Angebot | `kunde_akzeptiert` | `8aace99d-b98c-4cef-8f2a-cd9ebd01cfb3` |
| Position | Türöffnung · Sanitär · kein HW | `213e6b66-4559-41fe-8859-837713c873da` |
| RE Entwurf Abschlag | 787,78 € | `ebfe1287-0dff-4068-8f90-a791e2d69de3` |
| RE Entwurf Schluss | 1.575,56 € | `9adc0ed3-8aef-41e8-8153-c8cf487f1b67` |
| RE Entwurf Voll | 1.575,56 € | `5ebe121b-3a1d-42df-b192-cf3171b06ba5` |
| GS Entwurf | −1.575,56 € | `8fe529e8-e529-4c61-a639-f635eb82b512` |
| RE storniert (ohne Nr.) | 1.575,56 € | `ee182d02-b18f-48a8-8870-f978e0225c0a` |
| HV-Leads E2E (Etappe 3) | ohne Auftrag | `ed941123-…`, `dc47f7ac-…` |

**Projekt-URL (korrekt):**  
`https://staging--baerenwald-backend.netlify.app/projekt/2d36e9916d80244514df3eef7d7edfb027056dc3d3e9f43c28b7e1be22d967d9`

---

## Katalog C — Auftrag

### F-069 · T-C01 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | CRM · `/auftraege/11209afb-…` · Tab Leistungen |
| Screenshot | `T-C01-leistungen-posboard.png`, `T-D-zahlung-entwuerfe.png` |
| Erwartet | Positionen ändern → Summen + Zahlplan konsistent; Portal/Projekt aktuell |
| Beobachtet | PosBoard/Leistungen zeigt 1 Position, Summen Netto/MwSt/Brutto korrekt (1.324 / 251,56 / 1.575,56). Zahlung: Abschlag/Schluss/Voll-Entwürfe parallel; Offen-Anzeige 1.575,56 €. **Hinzufügen/Ändern/Löschen live nicht durchgespielt** (Auftrag später abgeschlossen; Mail-/Risiko-Stopp). Projekt-Link zeigt keine Positionsdetails (nur Phasen/Angebot). Position `fuer_kunde_sichtbar=false`. |
| Einordnung | Teil · Live-Mutation ausstehend |

---

### F-070 · T-C02 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Keine Partner-Zuweisung (`handwerker_id=null`). Neu-Disponieren A→B nicht möglich. |
| Einordnung | Seed |

---

### F-071 · T-C03 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | „An HW senden“ + Partner-Ablehnung setzt Partner/Versand voraus. Mail-STOPP. |
| Einordnung | Seed + Mail-STOPP |

---

### F-072 · T-C04 · ✅ Bestanden (Backlog-Ist) · —

| Feld | Inhalt |
|---|---|
| Erwartet | Nachtrag-Token ohne Ablehnen-Button (bewusstes Ist); Auftrag pausiert wenn Kunde nicht reagiert |
| Beobachtet | Code `NachtragPublicForm.tsx`: nur Button **„Ich stimme dem Nachtrag zu“** — **kein Ablehnen**. Live kein Nachtrag/Baustopp angelegt (0 Baustopps am Auftrag; Mail-/Zustand). |
| Einordnung | **Bekannt (Backlog)** — Ablehnen fehlt wie im TESTPLAN vorgesehen = ✅ |

---

### F-073 · T-C05 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Kein offener Nachtrag zum Zurückziehen. Code: Token-Seite ungültig → Text „Dieser Link ist nicht mehr gültig“ (analog Projekt). |
| Einordnung | Vorbedingung fehlt |

---

### F-074 · T-C06 · ⚠️ Teilweise (Code) · —

| Feld | Inhalt |
|---|---|
| Erwartet | Staff hebt Baustopp manuell auf; Weg dokumentieren |
| Beobachtet | Action **`beendeBaustopp`** · UI-Label **„Baustopp beenden“** in `AuftragNachtragBaustoppSection.tsx`. Live kein aktiver Baustopp. |
| Einordnung | Code-Ist dokumentiert |

---

### F-075 · T-C07 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Storno bei offener Rechnung + Partner: kein Partner; Auftrag bereits abgeschlossen; Storno-Flow nicht ausgeführt (destruktiv + Mail-Risiko). |
| Einordnung | Zustand + Vorsicht |

---

### F-076 · T-C08 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Keine Bautagebuch-Einträge am Auftrag. Tab „Bautagebuch“ vorhanden. |
| Einordnung | Seed |

---

### F-077 · T-C09 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Keine Abnahme mit Mängeln (Etappe 2 T-PDF-09 war 🚫). Mieter-Timeline-Gate für offene Mängel nicht live prüfbar. |
| Einordnung | Seed |

---

### F-078 · T-C10 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Abhängig von C09. |
| Einordnung | Vorgänger |

---

### F-079 · T-C11 · ❌ Fehlgeschlagen · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | Kunde · CRM `/projekt/[token]` vs. Website `/projekt/[token]` |
| Screenshot | `T-C11-projekt-crm-domain.png`, `T-C11-projekt-token-404.png`, `T-C11-crm-vs-portal-status.png` |
| Erwartet | 5 Phasen, Fortschritt, Timeline, Angebote/Nachträge = CRM |
| Beobachtet | **CRM-Domain:** 5 Phasen (Anfrage→Fertig), Fortschritt, Meilenstein „Auftrag erstellt“, Angebot-Accordion — nach Abschluss konsistent **Abgeschlossen**. **Website-Domain:** Marketing-**404** „Diese Seite gibt es nicht.“ (nicht gestaltete Token-Fehlerseite). Timeline: „Noch keine Updates…“ trotz Abschluss. Früher bei Status `offen` zeigte das Portal bereits „Abgeschlossen“/volle Phasen — DB hatte zwischenzeitlich `offen`→`abgeschlossen`; exakter Zwischenstand nur teilweise belegt. |
| Einordnung | Neuer Fund (falsche Domain / 404) · Timeline dünn |

---

## Katalog D — Rechnung

### F-080 · T-D01 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | CRM · Zahlung / `/rechnungen/ebfe1287-…` |
| Screenshot | `T-D-zahlung-entwuerfe.png`, `T-D01-rechnungsentwurf-abschlag.png` |
| Erwartet | Entwurf bearbeiten + löschen; Nummernkreis dokumentieren |
| Beobachtet | Mehrere Entwürfe sichtbar; Detail „Rechnung bearbeiten“ / „Rechnung versenden“ (Versand = Mail-STOPP). Löschen laut UI in Zahlung-Liste (⋯ → Löschen, `RechnungAuswahlPanel`). **Löschen live nicht ausgeführt** (Daten für spätere Etappen). Code `deleteRechnungEntwurf`: löscht DB-Zeile; erlaubt Status inkl. `gesendet`/`bezahlt`/`storniert` — Alias `deleteRechnung`. Alle Staging-Entwürfe: **`rechnungsnummer=null`** (Nummer erst bei Versand, vgl. T-PDF-05 / Etappe 2). |
| Einordnung | Teil · Code-Hinweis aggressives Löschen |

---

### F-081 · T-D02 · ⚠️ Teilweise (Code) · Wichtig

| Feld | Inhalt |
|---|---|
| Erwartet | Gesendete RE: direktes Bearbeiten blockiert; Weg über Storno; deaktiviert-mit-Grund |
| Beobachtet | Live: keine gesendete RE. **Code:** `rechnungDarfImWizardBearbeitetWerden` erlaubt Wizard für `entwurf` **und** `gesendet`/`bezahlt`/`versendet` — widerspricht Erwartung „nur über Storno“. Separater Korrektur/Storno-Pfad in `rechnungen/actions.ts` existiert parallel. |
| Einordnung | Neuer Fund (Gate zu weit) · Live 🚫 Mail-STOPP |

---

### F-082 · T-D03 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Storno MIT Ersatz braucht gesendete RE. Code: `storno_neu` / Gutschrift + neue RE. |
| Einordnung | Mail-STOPP |

---

### F-083 · T-D04 · ⚠️ Teilweise (Code + Entwurf) · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Gutschrift-**Entwurf** `8fe529e8-…` (−1.575,56 €) existiert am Auftrag. Live-Storno-als-Gutschrift aus gesendeter RE nicht. Code `createGutschriftFromRechnung`. |
| Einordnung | Datenlage Entwurf |

---

### F-084 · T-D05 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Eine RE mit Status `storniert` ohne Nummer (`ee182d02-…`) — Entstehungspfad unklar; Storno OHNE Ersatz nicht bewusst durchgespielt. |
| Einordnung | Unklarer Seed |

---

### F-085 · T-D06 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Keine bezahlte Rechnung. Code: „Als bezahlt markiert (ohne Kunden-Mail)“ in `RechnungDetailClient`. |
| Einordnung | Seed |

---

### F-086 · T-D07 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Keine gesendete/überfällige RE. Mahnung würde Mail-Pfad/Cron berühren — nur Vorschau geplant, aber ohne gesendete Basis nicht ausgeführt. |
| Einordnung | Seed + Mail-STOPP |

---

### F-087 · T-D08 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Screenshot | `T-D-zahlung-entwuerfe.png` |
| Erwartet | Zahlplan ändern bei gestelltem 1. Abschlag; Rest korrekt; gestellte Abschläge unverändert |
| Beobachtet | UI „Abschlagsplan bearbeiten“ vorhanden. **Kein gestellter** (gesendeter) Abschlag — nur Entwürfe. Parallel Voll-Rechnung + Abschlag + Schluss als Entwürfe → Zahlplan wirkt überladen; Offen-Summe 1.575,56 €. Plan-Änderung nicht live mutiert. |
| Einordnung | Teil |

---

### F-088 · T-D09 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | 0 relevante Eingangsrechnungen / kein Partner. |
| Einordnung | Seed |

---

### F-089 · T-D10 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Wie D09. |
| Einordnung | Seed |

---

## Zusätzliche Funde

### F-090 · Auftrag abgeschlossen + Primär-CTA „Rechnung versenden“ · ⚠️ · Wichtig

| Feld | Inhalt |
|---|---|
| Beobachtet | Auftrag-Status **Abgeschlossen**, Primäraktion weiterhin **Rechnung versenden** (Entwürfe). Ob gewollt: dokumentieren — potenziell verwirrend. |
| Einordnung | Neuer Fund / UX-Ist |

### F-091 · Website `/projekt/[token]` · ❌ · Wichtig

| Feld | Inhalt |
|---|---|
| Beobachtet | Gleicher Token auf `staging--baerenwald.netlify.app` → Marketing-404 statt CRM-Projektseite oder neutraler Token-Fehlerseite. `projektUrlFromToken` nutzt `getPublicAppUrl()` (CRM/`NEXT_PUBLIC_APP_URL`). |
| Einordnung | Neuer Fund (Domain-Mismatch) |

---

## Fund-Liste Etappe 4

| ID | Kurz | Schwere |
|---|---|---|
| F-069 | C01 PosBoard nur Ansicht | Wichtig |
| F-072 | C04 Ablehnen fehlt = Backlog OK | — |
| F-074 | C06 „Baustopp beenden“ | — |
| F-079 | C11 Projekt-Link / Phasen | Wichtig |
| F-080 | D01 Entwurf/Lösch-Code | Wichtig |
| F-081 | D02 Wizard erlaubt gesendet/bezahlt | Wichtig |
| F-087 | D08 Zahlplan nur Entwürfe | Wichtig |
| F-090 | Abgeschlossen + RE versenden CTA | Wichtig |
| F-091 | Website-Projekt-URL 404 | Wichtig |

---

## Commit-Vorlage (GitHub Desktop)

1. `docs/test/TESTREPORT-ETAPPE-4.md` — Report Katalog C/D, Funde F-069ff., ID-Liste.
2. `docs/test/screenshots/etappe-4/*` — CRM Auftrag/Leistungen/Zahlung, Projekt-Link CRM vs. Website-404.

---

## Blocker für Restabdeckung

1. Mail-Catcher / Staging-Guard (Etappe 0) — sonst kein RE-Versand → D02–D07.
2. Partner-Zuweisung + ggf. neuer offener Auftrag (aktueller Berger-Auftrag = abgeschlossen).
3. Nachtrag/Baustopp/Abnahme-Mängel-Seed für C04–C10.
)
