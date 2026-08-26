# TESTREPORT — R2-Etappe 4 (Erwartungs-Check)

| Feld | Wert |
|---|---|
| Etappe | R2-4 — Erwartungs-Check |
| Datum | 2026-08-25 |
| Umgebung | Staging |
| Screenshots | `docs/test/screenshots/r2-4/` |
| Fund-IDs | ab **F-165** |
| Ergebnis | Inventuren **teilweise**; Roundtrip/Findbarkeit Stichprobe |

Bezug Regeln (Leitfaden-Nachtrag, falls noch nicht merged): Empty ohne eigenen CTA · Aktionen als Bedienelement · Loading >1 s sichtbar.

---

## Block A — Belal B-01…B-05 + Mustersuche

### R2-X-B01 — Doppelter Hinzufügen / Empty-CTA · Inventur

| Fläche | Beobachtung | Verstoß? |
|---|---|---|
| Lead `6eba4479` Tab Leistungen | `hinzufügen_count=0` auf Stichprobe; kein Empty+Button-Paar gesehen | — |
| Systemweite Inventur | **nicht vollständig** (Zeit) — Folgeauftrag Frontend-Glattzieh | offen |

**Regel-Soll:** Header trägt Primary; Empty nur Hinweistext. Vollständige Card/Listen-Inventur = Backlog nach Runde 2.

### R2-X-B02 — Nackte Text-Aktionen · Inventur

| Fläche | Beobachtung |
|---|---|
| Lead Detail / Kunden-Objekte (Stichprobe) | Keine Treffer auf „Entfernen/Bearbeiten“ als nackter Text in der Automation |
| Hausmeister-Stelle (B-02 Original) | Objekt-Tab/Team-UI in Stichprobe nicht bis zur Originalstelle navigiert |

→ Inventur **unvollständig**; kein Freispruch. Screenshot `b02-objekte.png`.

### R2-X-B03 — PWA/Login Schwarzbild · Messung

| Übergang | Messung | >1 s ohne Indikator? |
|---|---|---|
| CRM Login (Kalt, Desktop) | ~3,2–4,1 s bis Dashboard | ⚠️ möglich — kein Skeleton/Splash in Automation beobachtet |
| Partner Login → Übersicht | ~8 s inkl. „Partner-Portal wird geladen…“ | ✅ Indikatortext vorhanden |
| `/auth/callback` / PWA-Kaltstart | **nicht** gemessen (kein installiertes PWA in Headless) | 🚫 |

### R2-X-B04 — Button-Varianten gleiche Aktions-Art · Inventur

| Aktions-Art | Stichprobe | Abweichung |
|---|---|---|
| Login CRM vs. Partner/Portal | unterschiedliche Surfaces (MockBtn CRM vs. Portal-UI) | bewusst getrennte Designsysteme — dokumentieren, kein Soft-Fail |
| Cookie Ablehnen/Akzeptieren | gleiche Box 136×40 | ✅ |
| CSV (Vorgänge) | Icon-Button mit title „CSV exportieren“ | ok |
| QR/Aushang vs. Login (B-04) | Aushang-PDF-Buttons HV nicht bis Klick verglichen | 🚫 Teil |

### R2-X-B05 — Schwebende Infotexte · Inventur

| Fläche | Beobachtung |
|---|---|
| Lead Cards | Kein „Beirat/Notfall“-Text gefunden |
| Org-Tab Kunde Nord | `beirat/notfall` im Body **false** |

Originalstelle B-05 in dieser Session **nicht** reproduziert → 🚫 / nachsuchen im Freigabe-Settings-Card.

---

## Block B — Feedback-Audit („Weiß ich, was passiert ist?“)

| Aktions-Art | Screens (Soll 3) | Ist |
|---|---|---|
| Speichern Sheet | — | 🚫 Notiz-UI nicht erreicht |
| Senden | — | 🚫 Catcher/`email_log` leer (F-164) |
| Löschen | — | 🚫 bewusst kein Confirm-Accept |
| Status-Wechsel | Lead Primary „Warte auf HV“ | Klick ohne sichtbare Zustandsänderung in Stichprobe |
| Freigabe | — | kein ausstehend-Lead |
| Upload | Melde-Foto R2-2/R2-3 | Funnel fortschreitet = Feedback ok |
| Abhaken ohne Farbe | — | 🚫 nicht geprüft |

**Fund-Kandidat:** stumme Primary „Warte auf HV / Hausmeister“ (Klick → gleich) — als **F-166** wenn reproduzierbar ohne Sheet/Modal.

---

## Block C — Roundtrip-Datentest

| ID | Status | Kurz |
|---|---|---|
| R2-X-C1 | 🚫 | Max-Angebot+PDF+Mail nicht ausgeführt (Catcher + Wizard-Zeit) |
| R2-X-C2 | 🚫 | Rechnung max. Felder nicht |
| R2-X-C3 | 🚫 | Abnahme-PDF nicht |
| R2-X-C4 | 🚫 | Nachtrag-Token Roundtrip nicht |
| R2-X-C5 | ❌ **F-165** | Melde-Funnel-Daten in DB (`situation=kaputt`, `bereiche=[sanitaer]`, `funnel_daten` vorhanden), aber in CRM-UI Übersicht/Leistungen/Akte **keine** sichtbaren Funnel-Angaben (Wasser/Küche/Freitext/Dringlichkeit). Melder+E-Mail+Leopold sichtbar. Screenshots `c5-*.png` |

---

## Block D — Findbarkeit

| ID | Aufgabe | Ergebnis | Klicks / Zeit | Irrwege |
|---|---|---|---|---|
| R2-X-D1 | Tel Kunde ändern (Staff) | ⚠️ | Suche „Musterverwaltung Nord“ → **0 Zeilen** in Automation; Pfad unklar | Listensuche liefert nichts (Index/Filter?) |
| R2-X-D2 | HV-Freigabe-Status? (Staff) | ⚠️ | Lead geöffnet (~3 s); Wort „Freigabe“ nicht sichtbar (`org_freigabe=nicht_noetig`) | Erwartung: Status irgendwo lesbar — bei „nicht nötig“ fehlt Label |
| R2-X-D3 | Abnahmeprotokoll (Kunde Portal) | ⚠️ | Berger-Portal lädt; Vorgänge-Liste sichtbar; Abnahme-Download **nicht** in <2 Min gefunden | Start Portal ok, Dokument-Weg unklar |
| R2-X-D4 | RE stornieren | 🚫 | nicht gestartet (Destruktion/Confirm) | — |
| R2-X-D5 | Aushang erzeugen (HV) | 🚫 | Dashboard ok, Aushang-Pfad nicht bis Ende | — |
| R2-X-D6 | Wann kommt HW? (Mieter Status) | ✅ (R2-2) | Status-Timeline zeigt Phasen; Termin-Info wenn vorhanden | — |
| R2-X-D7 | Partner RE einreichen | 🚫 | Detail offen, Einreich-Weg nicht gefunden | — |
| R2-X-D8 | Benachrichtigungen | ✅ | `/einstellungen` → Firma; Treffer auf Mail/Notify-Themen in Text | 1 Navigation |

---

## Funde

### F-165 · R2-X-C5 · Wichtig
| | |
|---|---|
| Erwartet | Funnel-Angaben (Situation, Bereich, Umfang/Zeitraum, Freitext, …) vollständig im CRM-Lead |
| Beobachtet | DB hat `funnel_daten` / `bereiche`; UI Übersicht/Leistungen/Akte zeigt sie nicht |
| Screenshot | `screenshots/r2-4/c5-übersicht.png` (bzw. `c5-*.png`) |
| Einordnung | Neuer Fund |

### F-166 · Feedback · Kosmetik (vorbehaltlich)
| | |
|---|---|
| Erwartet | Primary-CTA ändert Zustand oder öffnet erklärendes Sheet |
| Beobachtet | „Warte auf HV / Hausmeister“ Klick ohne sichtbare Änderung (R2-2/R2-4 Stichprobe) |
| Einordnung | Neuer Fund / UX |

---

## Inventur-Tabellen (Grundlage Frontend-Paket)

### Empty/Hinzufügen (B-01) — Startliste

| Screen | Header-Primary? | Empty-eigener Button? | Notiz |
|---|---|---|---|
| Lead Leistungen (Stichprobe) | unklar | nein gesehen | nachziehen |
| … | | | **vollständige Inventur offen** |

### Nackte Aktionen (B-02) — Startliste

| Screen | Aktion | Ist-Kontrolle | Soll |
|---|---|---|---|
| (Hausmeister Original) | Entfernen/Bearbeiten | nicht erreicht | MockBtn ghost / ⋯ |
| … | | | **offen** |

### Loading >1s (B-03) — Startliste

| Übergang | Dauer | Indikator |
|---|---|---|
| CRM Login | ~3–4 s | oft keiner |
| Partner Login | ~8 s | Text „wird geladen“ |
| PWA Kaltstart | n/a | — |

---

## Freigabe

R2-4 liefert **Stichproben + F-165/F-166**, keine vollständige Inventur A/B/C. Für Frontend-Glattzieh-Paket: Inventuren A bewusst als Folgeauftrag führen.
