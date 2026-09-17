# TESTREPORT-ETAPPE-8 — Aktions-Matrix Cards & Zeilen

| Feld | Wert |
|---|---|
| Etappe | 8 — Aktions-Matrix (Bearbeiten / Löschen / Entfernen) |
| Datum | 2026-08-25 |
| Umgebung | Staging CRM + Website (Setup) |
| Maßstab | `PATTERN-LEITFADEN.md` Card-/Listen-Regel · Matrix `docs/test/AKTIONS-MATRIX.md` |
| Ergebnis | **T-AM-01** ✅ Matrix geliefert · **T-AM-02** ❌ Muster bricht Leitfaden (mehrere Funde) · **T-AM-03** ⚠️ 10 Stichproben (teils Confirm abgebrochen) |
| Screenshots | `docs/test/screenshots/etappe-8/` |
| Fund-IDs | fortlaufend ab **F-151** |
| Dauerhafte Referenz | **`docs/test/AKTIONS-MATRIX.md`** |
| Setup | `docs/test/TESTPLAN-SETUP.md` |

---

## Kurzüberblick

1. **Desktop-Listen (Vorgänge/Kunden/HW)** haben **kein** Zeilen-⋯ — Muster ist Checkbox→Bulk bzw. mobil Swipe. Leitfaden fordert `MockEntityRowMenu`/ActionSheet.
2. **Gefährlich:** `runDeleteVorgang` (Swipe) **ohne** Confirm; PosBoard-/Mangel-/Zahlplan-Löschen oft **ohne** Confirm; Notiz/Dokument: Inline-Trash + `window.confirm` (nicht MockModal, aber Confirm vorhanden).
3. **Positiv:** Vorgang-**Bulk**-Löschen öffnet MockModal „Vorgang löschen“; HV-Objekt-⋯ + PortalSheetConfirm + Legal-`disabled`+title; Kunde-Detail-⋯ mit „Kunde löschen“.
4. **Deaktiviert-mit-Grund** kaum umgesetzt — meist Verstecken oder Frozen-Badge statt ⋯-Eintrag mit Reason.

---

## T-AM-01 — Matrix

Vollständige Tabelle: **`docs/test/AKTIONS-MATRIX.md`** (29 Entitäten CRM+Portale).

### F-151 · T-AM-01 · ✅ Bestanden · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Matrix erstellt und als Referenz abgelegt. Abdeckung: alle geforderten CRM- und Portal-Typen (HV-Team = Feature aus). |
| Einordnung | Lieferobjekt |

---

## T-AM-02 — Funde (a)/(b)/(c)

### F-152 · (a) Vorgangszeile ohne Desktop-⋯ · ❌ · Wichtig

| Feld | Inhalt |
|---|---|
| Screenshot | `T-AM-vorgaenge-desktop.png` |
| Erwartet | ⋯ mit Bearbeiten / Löschen / Duplizieren |
| Beobachtet | Desktop: nur Checkbox + Bulk (Export/Löschen). Kein Zeilen-⋯. Mobil: Swipe. Kunden-/HW-Liste analog. |
| Einordnung | Neuer Fund · Inkonsistenz vs. PosBoard/HV-Objekt |

---

### F-153 · (b) Vorgang-Swipe löscht ohne Confirm · ❌ · Blocker

| Feld | Inhalt |
|---|---|
| Erwartet | Destruktiv immer Confirm-Modal (Verb+Objekt) |
| Beobachtet | `runDeleteVorgang` in `list-actions.ts` **ohne** `confirm`. Swipe ruft direkt Delete auf. Bulk-Pfad hat MockModal (live bestätigt). Standalone-RE: `window.confirm`. |
| Einordnung | Neuer Fund · gefährlich |

---

### F-154 · (b) PosBoard-Position löschen ohne Confirm · ❌ · Wichtig

| Feld | Inhalt |
|---|---|
| Erwartet | ⋯ → Confirm |
| Beobachtet | `PosBoard.tsx`: Menü „Löschen“ → direkt `remove(id)`. Angebot- und RE-Wizard teilen dasselbe Board. |
| Einordnung | Neuer Fund |

---

### F-155 · (a) Mangel / Dokument / Notiz = Inline-Trash · ❌ · Wichtig

| Feld | Inhalt |
|---|---|
| Screenshot | `T-AM-07-anfrage-notiz-trash.png` (Akte; Inline-Löschen live auslösbar) |
| Erwartet | ⋯, kein direktes Papierkorb-Icon |
| Beobachtet | Mangel: Pencil/Trash inline, kein Confirm. Dokument Akte: Inline Trash + `confirm()`. Notiz: Button „Löschen“ + `window.confirm("Notiz löschen?")` — Confirm-Text kurz, **kein** MockModal Verb+Objekt-Muster. |
| Einordnung | Neuer Fund · Musterbruch vs. PosBoard-⋯ |

---

### F-156 · (c) Zahlplan Frozen versteckt Trash · ⚠️ · Wichtig

| Feld | Inhalt |
|---|---|
| Erwartet | Nicht verfügbar = deaktiviert mit Grund im ⋯ |
| Beobachtet | Frozen Rates: Trash **versteckt**, Badge „fest“ + `title`. Kein ⋯-Eintrag „Löschen — gebunden an gesendete RE“. |
| Einordnung | Neuer Fund |

---

### F-157 · (c)/(b) Preislisten & Vorlagen: Löschen fehlt · ⚠️ · Wichtig

| Feld | Inhalt |
|---|---|
| Beobachtet | Preisliste: nur Edit-Sheet per Klick, **kein** Löschen am Eintrag. Vorlagen-Liste: nur Navigation. Fachlich oft nötig → Umweg unklar / fehlt. |
| Einordnung | Neuer Fund |

---

### F-158 · (a) Portal HV-Objekt ✅ vs. Partner-/Mieter-Zeile ohne ⋯ · ⚠️ · Wichtig

| Feld | Inhalt |
|---|---|
| Beobachtet | HV Objekt-Card: PortalActionMenu + PortalSheetConfirm + Legal disabled+title — nahe Soll. Partner-Vorgang / Mieter-Liste / Planer: nur Öffnen, kein ⋯. HV-Team deaktiviert (bekannt Etappe 5). |
| Einordnung | Teil · HV-Objekt = positives Ist |

---

## T-AM-03 — Stichproben-Klicktest (10)

| # | Entität / Ort | Aktion | Ergebnis | Screenshot |
|---|---|---|---|---|
| 1 | Vorgang Desktop | Auswahl → Bulk Löschen | MockModal „Vorgang löschen“ / endgültig — **Abbrechen** | `T-AM-01-vorgang-bulk-delete-confirm.png` |
| 2 | Vorgang Desktop | Zeilen-⋯ | **fehlt** | `T-AM-vorgaenge-desktop.png` |
| 3 | Kunde Detail | ⋯ Weitere Aktionen | Spam / Zusammenführen / **Kunde löschen** (rot) — Bearbeiten/Duplizieren nicht im ⋯ | `T-AM-10-kunde-actions-menu.png` |
| 4 | Notiz Anfrage-Akte | Inline Löschen | `confirm` Text **„Notiz löschen?“** — abgebrochen (`return false`) | Code + Button live |
| 5 | Einheit Leopold WE 12 | Sheet öffnen | Footer **Bearbeiten** / **Entfernen**; Mieter-Zeile ohne eigenes ⋯ in Sheet-Ansicht | `T-AM-12-einheit-sheet-aktionen.png` |
| 6 | Preisliste | Zeilen-Aktionen | Empty Boden; kein Löschen-UI | — |
| 7 | Kalender | Termin vorhanden | Chip „Vor-Ort-Termin“; Löschen laut Code im Sheet+confirm — Sheet nicht destruktiv durchgeklickt | — |
| 8 | Glocke | Panel Updates | Eintrag ohne ⋯/Löschen; Tabs Ungelesen/Gelesen; „Alle gelesen“ | `T-AM-20-benachrichtigungen-glocke.png` |
| 9 | PosBoard | Löschen | Code: kein Confirm (nicht live im Wizard — Mail-/Zustand) | — |
| 10 | HV-Objekt Portal | ⋯ | Code+Etappe 5: PortalActionMenu/Confirm — Live-HV-Login diese Etappe nicht | — |

### F-159 · T-AM-03 · ⚠️ Teilweise · —

| Feld | Inhalt |
|---|---|
| Beobachtet | 8/10 mit Live-UI; 2 Code-only (PosBoard, HV-Portal). Keine Seed-Löschung (Confirms abgebrochen). |
| Einordnung | Stichprobe ausreichend für Muster-Funde |

---

## Funde — Übersicht

| ID | Typ | Kurz | Schwere |
|---|---|---|---|
| F-152 | (a) | Vorgänge Desktop ohne ⋯ | Wichtig |
| F-153 | (b) | Swipe-Vorgang ohne Confirm | Blocker |
| F-154 | (b) | PosBoard-Löschen ohne Confirm | Wichtig |
| F-155 | (a)/(b) | Inline-Trash Notiz/Dokument/Mangel | Wichtig |
| F-156 | (c) | Zahlplan Frozen versteckt | Wichtig |
| F-157 | (c) | Preisliste/Vorlage ohne Löschen | Wichtig |
| F-158 | (a) | Portal-Muster uneinheitlich | Wichtig |

---

## Bekannt / Ausnahme

| Thema | Hinweis |
|---|---|
| HV-Team-UI aus | Etappe 5 / Matrix Zeile Teammitglied HV |
| Button-Migration | TESTPLAN Backlog — betrifft teils Icon-Styling, nicht Confirm-Logik |

---

## Nächste Nutzung

Neue Features: Aktionsmuster gegen **`AKTIONS-MATRIX.md`** prüfen und Zeile aktualisieren. Priorität Fix: F-153 (Confirm vor Vorgang-Delete), dann Listen-⋯ (F-152), PosBoard-Confirm (F-154).
