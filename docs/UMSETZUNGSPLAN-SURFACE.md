# Umsetzungsplan — Surface-Optimierung CRM

**Stand:** Juli 2026 · SoT: [SURFACE-KONSOLIDIERUNG.md](./SURFACE-KONSOLIDIERUNG.md) · [SURFACE-KOMPONENTEN-INHALTE.md](./SURFACE-KOMPONENTEN-INHALTE.md) · [SURFACE-NUTZER-COPY.md](./SURFACE-NUTZER-COPY.md)  
**Geltung:** `baerenwald-crm-dashboard` (Portal-Track separat)

## Rollen

| Rolle | Aufgabe |
|-------|---------|
| Designer | Doku-Fixes freigeben, Mock-Updates, Screen-Abnahme Maps A–C |
| Entwickler (Cursor) | Bau nach Spec/Mock; keine Git-Befehle — Dateiänderungen + Änderungsliste |
| Belal | Freigaben, Commits via GitHub Desktop, Endabnahme localhost vs. Mock |

**Ablauf pro Screen:** Analyse + Freigabeliste → Review → Freigabe → Bau → Commit → Abnahme.  
**Stopps:** Migrationen, Löschung Alt-Komponenten, offene Produktentscheidungen.

---

## Bereich 0 · Dokumenten-Fixes ✅

| # | Fix | Status |
|---|-----|--------|
| 0.1–0.16 | Primary-Def, ⋯, S9/S10, F3, Typo 20px, Compose, FAB, Inline-Grenze, Picker-Neu, Copy-Entscheidungen, Markdown-Pipe | **eingearbeitet** |

## Fortschritt Implementierung (Code)

| Bereich | Status | Sichtbar für Nutzer |
|---------|--------|---------------------|
| 1 Fundament | ✅ | `EditorSheet` / `DocumentCanvas` / `PickerSheet` live |
| 2.1 Naming | ✅ | FormSheet/SidePanel → EditorSheet |
| 2.2 PickerSheet | ✅ verdrahtet | Kunde (Angebot/RE), Katalog, Vorgang-FAB |
| 2.3 Position/Leistung | ✅ | Angebot + Auftrag Edit = Bottom Sheet / Slide-over |
| 2.4 Kunde/Partner Create | ✅ | `/neu?art=kunde\|handwerker` = Sheet-Host |
| 2.5 Rest-Modals | ✅ | Termin, Mail, Partner, Katalog, Zahlplan, Bautagebuch, Objekt |
| 3 AG/RE Canvas | ✅ Übergang | DocumentCanvas + DocBar; Chip-Steps statt Stepper |
| 4 Detail | ✅ | Mobile Drill-Down; Zahlplan Lese + EditorSheet |
| 5 Copy | ✅ teilweise | Angebot/Zahlplan/Picker kürzer |
| 6 Aufräumen | ✅ | Tote SidePanels + `/neu`-Fullpage-Bypass |

**Nutzer-Abnahme:** [SURFACE-ABNAHME-NUTZER.md](./SURFACE-ABNAHME-NUTZER.md) — Smoke bereit (Belal)

---

## Bereich 1 · Fundament

| ID | Todo | Abnahme |
|----|------|---------|
| S-1.1 | `EditorSheet` API: context detail\|canvas | 3 Layouts |
| S-1.2 | S7 Keyboard / sticky ✓ / visualViewport | Tastatur am letzten Feld |
| S-1.3 | S8 Dirty-Confirm ActionSheet | X, Swipe, Backdrop |
| S-1.4 | S9 Canvas-Exit + S10 Back-Handling | X=Auto-Entwurf; Back schließt Sheet |
| S-1.5 | Nested-Push im Sheet-Host | wählen→neu→zurück |
| S-1.6 | ActionSheet mobil/Desktop, ≤7 Actions | — |

## Bereich 2 · Surface-Migration

| ID | Todo | Abnahme |
|----|------|---------|
| S-2.1 | FormSheet/SidePanel → EditorSheet; MobileEditSheet Host | Naming |
| S-2.2 | PickerSheet verdrahtet (Kunde, Katalog, Vorgang) | Header-+ = Neu |
| S-2.3 | Position/Leistung-Modals → EditorSheet ≤8 Felder | — |
| S-2.4 | Kunde/Partner Create → Sheet-Host `/neu` | eine Surface |
| S-2.5 | Rest-Modals (Termin, Zuweisung, Objekt, Plan, Tagebuch, Compose, Katalog) | Mapping |

## Bereich 3 · Dokument-Flows (Designer → Dev)

| ID | Todo | Wer |
|----|------|-----|
| S-3.1 | Mock Angebot-Canvas | Designer |
| S-3.2 | Mock Rechnung-Canvas | Designer |
| S-3.3 | Mock Abnahme-Canvas | Designer |
| S-3.4 | Export + Positivliste + Freigabe | Designer |
| S-3.5 | Angebot/RE Wizard → DocumentCanvas + Sheets | Dev |
| S-3.6 | DocActionBar + Versand-Sheet Copy | Dev |
| S-3.7 | Soll-Copy §1–2 beim Bau | Dev |

## Bereich 4 · Detailseiten

| ID | Todo |
|----|------|
| S-4.1 | VorgangHeader: Titel · 1 Chip · 1 Primary · 1× ⋯ |
| S-4.2 | ⋯-Audit Nav/Zeilen/Listen ActionSheet |
| S-4.3 | Lese-Ansicht Pilot Zahlplan, dann Tabs |
| S-4.4 | Inline-Grenze 0.9; Overview→EditorSheet |
| S-4.5 | Mobile Drill-Down Screen1/2 |

## Bereich 5 · Copy

| ID | Todo |
|----|------|
| S-5.1 | Ist→Soll Ersatzliste pro Screen |
| S-5.2 | Hints >6 Wörter / Buttons >2 Wörter |
| S-5.3 | Toasts: Gespeichert · Gesendet · ≤8 |
| S-5.4 | Hard-Ban §14 bei Abnahme |
| S-5.5 | Partner/Netzwerk + Betreff-Drift |

## Bereich 6 · Aufräumen (Stopp vor Löschung)

| ID | Todo |
|----|------|
| S-6.1 | KundeModal, tote SidePanels, MockModal-Reste |
| S-6.2 | Dead UI (Tags, Onboarding-Hints, Scan-Empty) |
| S-6.3 | `/neu` nur Einstieg → Canvas/Sheet |
| S-6.4 | Entscheidungslog Löschungen |

---

## Reihenfolge

```
0 Doku ✅ → 1 Fundament → 2 Migration
                ├→ 3 Dokument-Flows (Mocks parallel ab 1)
                └→ 4 Detailseiten → 5 Copy → 6 Aufräumen
```

## Definition of Done — je Screen

1. Checkliste F (Fragen 1–8 + S7–S10 wo Overlay)  
2. Map A/B/C auf Mobile-Viewport  
3. Copy = Soll-Tabelle, Hard-Ban-frei  
4. Belal: localhost vs. Mock  

---

## Was sich am Ende ändert — Test-Checkliste

Siehe Abschnitt unten + [SURFACE-TEST-CHECKLISTE.md](./SURFACE-TEST-CHECKLISTE.md).
