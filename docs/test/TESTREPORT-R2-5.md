# TESTREPORT — R2-Etappe 5 (Stress & Edge Cases)

| Feld | Wert |
|---|---|
| Etappe | R2-5 — Stress & Edge |
| Datum | 2026-08-25 |
| Umgebung | Staging (`staging--baerenwald-backend` / `staging--baerenwald`) |
| Screenshots | `docs/test/screenshots/r2-5/` |
| Artefakte | `docs/test/r2-5-data/` · Log `screenshots/r2-5/stress-log.txt` |
| Fund-IDs | ab **F-167** |
| Ergebnis | Block 1/4/6 stark · 2/3/5/7 teilweise · Limit-Tabelle unten |
| Anleitung | [`R2-ANLEITUNG.md`](./R2-ANLEITUNG.md) (Belal-Selbsttest separat) |

Regeln: nur ZZTEST-Wegwerf · keine Fixes · Confirms nur beim Aufräumen akzeptiert.

---

## Kurzfazit

**Kein Absturz / kein Script-Exec / kein Layoutbruch** bei 10k-Notiz + XSS/Unicode in der Akte. Leer/Whitespace-Notizen werden UI-seitig geblockt. API lehnt leeren Namen mit klarer Meldung ab. **Offen:** Zahlen-/Datums-Wizard, Mengen-Last (100 Pos.), Melde-Foto-Pfad in Automation, echte Zwei-Tab-Überschreib-Probe, PDF/Portal-Folge-Checks.

---

## Block 1 — Text-Extreme

**Träger:** Notizen auf Lead `6eba4479-…` (Akte), plus API-Lead-Nachricht.

| Variante | Ergebnis |
|---|---|
| (a) 10.000+ Zeichen | ✅ gespeichert (`len=10009`), UI wrappt, kein Crash (`b1-long.png`, Akte-Screenshot) |
| (b) 1 Zeichen | ✅ gespeichert |
| (c) nur Leerzeichen | ✅ Speichern **disabled** (`note-send`) |
| (d) leer | ✅ Speichern **disabled** |
| (e) Zeilenumbrüche | ✅ gespeichert |
| (f) Unicode (Emoji/CJK/Arabisch) | ✅ sichtbar als Text |
| (g) `<b>x</b>` / `{{t}}` / `${v}` / SQL-Fragment | ✅ als Text gerendert, **kein** Script-Exec |

**Folge-Check Liste/Card/Portal/PDF:** Liste Anfragen lädt (~1,5 s). Portal/PDF/Mieter-Timeline für dieselben Strings **nicht** in dieser Etappe durchgestochen → ⚠️.

**Andere Felder** (Melde-Freitext, Angebots-Kopf/Fuß, Kundenname, Objekt, Einheit, Bautagebuch, Mangel): **nicht** einzeln live durchgespielt → in Limit-Tabelle als „analog Notiz / offen“ markiert.

---

## Block 2 — Zahlen-Extreme

| Check | Status | Beobachtung |
|---|---|---|
| Wizard Zahlenfelder | 🚫 | `/angebote/neu` blieb am Kunden-Gate · `num_inputs=0` |
| Menge/Preis 0, negativ, `abc`, Locale | 🚫 | UI nicht erreicht |
| `summenAusPositionen` (Code) | ℹ️ | End-Netto `Math.max(0, …)` → Summe nicht negativ; Zeilen-Negativ nicht explizit geclampt vor Aggregation |
| Freigabe-Schwelle 0/leer | 🚫 | kein frischer ZZTEST-Kunde mit Org-Tab in dieser Session angelegt |
| Zahlplan ≠ Summe / MwSt 0,01×3 | 🚫 | nicht live |

---

## Block 3 — Datums-Extreme

| Check | Status |
|---|---|
| Gültigkeit gestern/heute/31.02./1999/2199 | 🚫 keine `input[type=date]` am Gate |
| RE-Fälligkeit vor Rechnungsdatum | 🚫 |

→ **offen** für Nacharbeit / manuell.

---

## Block 4 — Mengen-Extreme (Performance-Stichprobe)

| Fläche | Zeitklasse | ms (domcontentloaded+kurz) |
|---|---|---|
| Vorgänge | 1–3 s | ~1514 |
| Anfragen | &lt;1 s | ~901 |
| Kunden | &lt;1 s | ~888 |
| Angebote | 1–3 s | ~1131 |
| Suche „ZZTEST“ | 1–3 s | ~1511 |
| CSV-Klick | 1–3 s | ~1037 |

| Last-Szenario | Status |
|---|---|
| Angebot 100 Positionen + PDF | 🚫 |
| Meldung Maximal-Fotos | 🚫 |
| Objekt 50 Einheiten | 🚫 |
| Kunde 30 Vorgänge | 🚫 |
| 100 Glocken | 🚫 (Staging hatte **3** ungelesen) |

---

## Block 5 — Datei-Extreme

| Probe | Ort | Ergebnis |
|---|---|---|
| &gt;8 MB | CRM Notiz-Foto | Console **413**; dauerhafter Toast in Automation **nicht** belegt → **F-168** |
| exakt 8 MB | CRM Notiz-Foto | kein klarer Toast in Log |
| 0 Byte | CRM | Input akzeptiert/ohne klare Fehlermeldung in Stichprobe |
| `.exe` als `.jpg` | CRM | kein harter Client-Stopp beobachtet |
| Melde-Funnel Upload | Website | Automation blieb oft vor Foto-Schritt / kein File-Input → ⚠️ |
| 50 MB / SVG / 200-Zeichen-Name / Doppel-Upload | — | 🚫 nicht live |
| CSV 10k + Injection-Fixture | Datei `r2-5-data/big_latin1.csv` / `inject.csv` | **nicht** hochgeladen/re-exportiert |

**Code-Fund F-167:** Website `PhotoUpload` meldet **max. 10 MB/Datei**; CRM Notiz-Foto + `meldung-storage` **8 MB**. Uneinheitliches Limit.

---

## Block 6 — Zustands-Extreme (zu wenig)

| Fall | Ergebnis |
|---|---|
| `POST /api/lead` Name `""` | ✅ `400` `{"ok":false,"error":"Ungültiger Name"}` |
| Name nur Spaces | ✅ `400` gleiche Meldung |
| Name ok + XSS-Nachricht | ✅ `200` Lead `8abb24da-…` (Nachricht in DB; Übersicht zeigt Freitext **nicht** — Anschluss an F-165) |
| Angebot ohne Position senden | ⚠️ Gate, kein Senden-Button |
| RE 0 € / Auftrag ohne Pos. / Objekt ohne Adresse / leerer Zahlplan | 🚫 |

---

## Block 7 — Gleichzeitigkeit

| Fall | Status |
|---|---|
| Zwei Tabs Notiz speichern | ⚠️ erster Lauf brach an Tab-2-Login ab; später fehlte Textarea-Selektor in Cont-Skript. **Nicht belastbar** entschieden |
| Staff vs. HV Freigabe parallel | 🚫 |
| Zwei Tabs RE bezahlt | 🚫 (Seed-RE nicht angefasst) |

---

## Funde

| ID | Schwere | Kurz |
|---|---|---|
| **F-167** | mittel | Upload-Limit Melde/Website **10 MB** vs. CRM Notiz/Meldung-Storage **8 MB** — inkonsistente UX/Fehlertexte |
| **F-168** | niedrig/mittel | Oversized Notiz-Upload → **HTTP 413**; in Automation kein stabil sichtbarer Nutzer-Toast (nur Console) |
| (Hinweis) | — | XSS/Template-Strings in Notiz = Text ✅; in `kontakt_nachricht` gespeichert, in Übersicht nicht sichtbar (= F-165-Familie) |

Keine neuen Crash-/XSS-Exec-Funde.

---

## Abschlusstabelle — Feld → Limit-Verhalten

> Dauerhafte Referenz (Analog Aktions-Matrix). „Live“ = in R2-5 beobachtet; sonst Code/Ableitung.

| Feld / Kontext | Limit / Extreme | Verhalten | Quelle |
|---|---|---|---|
| Lead-Notiz Text | leer / nur Spaces | Speichern disabled | Live UI |
| Lead-Notiz Text | 1 Zeichen | ok speichern | Live |
| Lead-Notiz Text | ≥10 000 Zeichen | ok speichern, Wrap in Akte, kein Crash | Live + DB |
| Lead-Notiz Text | HTML/SQL/Template/Unicode | als Text, kein Exec | Live |
| Lead-Notiz-Foto | &gt;8 MB | Client-Toast vorgesehen; Server kann 413 | Code + Live Console |
| Lead-Notiz-Foto | Typ-Hinweis | JPEG/PNG/WebP/GIF/HEIC · 8 MB | UI-Hint |
| Website Melde-Foto | pro Datei | **10 MB**; Gesamt **30 MB** | Code `PhotoUpload` |
| Org/Meldung Storage | Foto | **8 MB**; Video 100 MB | Code `meldung-storage` |
| `POST /api/lead` Name | leer/Spaces | 400 „Ungültiger Name“ | Live |
| Angebot-Summen | negatives Netto-Ergebnis | floored auf 0 | Code `summenAusPositionen` |
| Freigabe-Schwelle | leer → `null` speichern | Org-Save mappt `''` → `null` | Code `KundenOrganisationTab` |
| Kundennamen / Objekt / Mangel / Bautagebuch / Angebots-Kopf/Fuß | Extreme | **nicht live** in R2-5 | offen |
| Zahlen (Preis/Menge/Rate) | 0 / neg / abc / Locale | **nicht live** | offen |
| Datum | ungültig / Extremjahre | **nicht live** | offen |
| Zwei-Tab-Speichern | gleicher Datensatz | **nicht belastbar** | offen |

---

## Aufräum-Liste

| Entität | ID / Merkmal | Aktion | Status |
|---|---|---|---|
| Lead API-Stress | `8abb24da-…` | erst „Verloren“, danach mit Kunden-Löschen mitentfernt | ✅ in DB weg |
| Kunde (auto aus Lead) | `eaab05a6-…` / `zztest.r2.stress.api@…` | Confirm „Kunde löschen?“ | ✅ in DB weg |
| Stress-Notizen auf E2E-Lead | Lead `6eba4479-…` | Confirm „Notiz löschen?“ × n | ✅ Akte **Notizen · 0** |
| Frischer Privat-Kunde „R2-STRESS“ | — | Create in Automation gescheitert | — nichts zu löschen |
| Seed (Auftrag/RE/Org/Leopold) | — | **nicht** angefasst | tabu eingehalten |

**Hinweis:** E2E-Lead `6eba4479` blieb als Seed/Vorgang bestehen (nur Stress-Notizen entfernt).

---

## Belal — R2-ANLEITUNG + Selbsttest

Siehe [`R2-ANLEITUNG.md`](./R2-ANLEITUNG.md). Der **30‑Min-Selbsttest** (Mieter Handy / HV / Staff + Wo?/Was?/Hä? ab B-06) ist **nicht** Teil dieser Agent-Etappe — bitte separat nach Deploy laufen und Liste an Claude.

---

## Commit-Vorlage (GitHub Desktop)

**Geändert / neu**

- `docs/test/TESTREPORT-R2-5.md` — Stress-Report, Limit-Tabelle, Aufräum-Liste, F-167/F-168  
- `docs/test/R2-ANLEITUNG.md` — Ablauf Runde 2 + Selbsttest-Kurzplan  
- `docs/test/screenshots/r2-5/*` — Screenshots + `stress-log.txt`  
- `docs/test/r2-5-data/*` — Stress-Payloads (10k, XSS, CSV, Binaries)  
- `scripts/r2-5-stress.mjs` (+ ggf. Cont/Final) — reproduzierbare Stress-Automation  

**Vorschlag Commit-Message:** `test(r2-5): Stress-Report, Limit-Tabelle und Aufräum-Protokoll`
