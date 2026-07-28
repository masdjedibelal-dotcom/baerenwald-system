# Designer-Abgleich — Mock ↔ codierte App

**Für:** Designer / Design-Review  
**Stand:** 2026-07-28  
**Soll (Mock):** `Baerenwald CRM (standalone) (9).html` + Umsetzungskatalog (Mock 1:1)  
**Ist (App):** `baerenwald-crm-dashboard` · lokal typisch `http://localhost:3001`  
**Evidence-Klicks:** `docs/umsetzung/N6-DURCHKLICK.md` · Screenshots `docs/umsetzung/n6-evidence/`

---

## 0. Kurzurteil für dich

| Ebene | Status |
|---|---|
| **Informationsarchitektur** (Nav, 5 Tabs, Liste, Surfaces) | weitgehend = Mock |
| **Interaktion** (Primary-CTA, Sheets, Canvas, WV, Mahnung) | weitgehend da |
| **Visuelle Feinheit** (Pixel, Typo überall, Spacing, Card-in-Card) | **nicht 1:1** — Tokens da, Legacy-Reste möglich |
| **Sonderfälle** (Notfall im FAB, Duplikat-Band, Reklamation, HW-Anfrage-CTA) | **Lücken / versteckt** |

**Abnahme Design:** noch **nicht** erteilt. Dieses Dokument ist der Soll/Ist-Checkliste zum Abgleichen — bitte Mock und App nebeneinander öffnen (Desktop + Mobil).

---

## 1. Was du vergleichen sollst (Arbeitsanweisung)

Pro Screen:

1. Mock öffnen → Screen einstellen  
2. App öffnen → denselben Job  
3. In der Tabelle unten: Spalte **Abweichung** bestätigen oder ergänzen  
4. Markiere: `OK` · `klein` · `groß` · `fehlt`

**Viewport:** Desktop ~1440px und Mobil ~390px.

---

## 2. Design-System (Tokens)

| Thema | Mock (Soll) | App (Ist) | Abweichung |
|---|---|---|---|
| Grün Brand | `#2E7D52` / dunkles Sidebar-Grün | gleich über CSS-Vars (`--green`, Mock-Design-System) | OK — nicht Lexware-Türkis |
| Canvas | Weiß / sehr hell | Weiß (bewusst, kein Slate-Grau) | OK |
| Typo-Stufen | 4 Stufen (Meta / Text / Title / Head) | Tokens `--fs-meta` 12 · `--fs-text` 13.5 · `--fs-title` 15 · `--fs-head` 19 | Nach N1 gemappt; Stichproben nötig, ob überall greift |
| Spacing | Card-Padding / Gaps aus Spec | Tokens `--sp-*`; Nested Cards nach N2 entschärft | Stichprobe: Doppelrahmen noch irgendwo? |
| Statusfarben | 4 Töne (grau · blau · grün · rot) | `StatusBadge` + `STATUS_TONE` | OK strukturell |
| Buttons | 1 Primary grün pro Viewport | `primaryCta`-Matrix | Prüfen: keine zweiten grünen Konkurrenten im Header+Streifen |
| Overlays | Sheet (Slide/Bottom) oder Document-Canvas — **kein** Wizard-Stepper | `EditorSheet` · `DocumentCanvas`; `WizardShell` entfernt | Manche Dateinamen heißen noch „Modal“, Verhalten = Sheet |

---

## 3. Shell & Navigation

| Element | Mock | App | Abweichung |
|---|---|---|---|
| Sidebar Arbeit | Dashboard · Vorgänge · Kunden · Handwerker | so | OK |
| Sidebar Organisation | Kalender · KI Analytics | so | OK |
| Einstellungen | unten abgesetzt | so | OK |
| Partner | kein Nav (→ Handwerker) | `/partner` Redirect | OK |
| Bottom-Nav Mobil | Dashboard · Vorgänge · **+** · Kunden · Mehr | so (Kalender unter Mehr) | visuell gegen Mock prüfen |
| FAB / Neu | Create-Menü | Anfrage · Angebot · Rechnung · Kunde · Handwerker | **fehlt: Notfall** (Mock/Spec: Direktauftrag) |

---

## 4. Vorgänge-Liste

| Element | Mock | App | Abweichung |
|---|---|---|---|
| Eine Liste aller Phasen | Chips Alle / Anfrage / Angebot / Auftrag / Rechnung / **Wartung & Pflege** | vorhanden | Chip-Wortlaut prüfen |
| Offen / Erledigt | Toggle mit Zählern | vorhanden | OK |
| Spalten | Kunde · Vorgang · Phase · Wert · Datum · Status | vorhanden + Spalten-Toggle | OK |
| Desktop Hover | Anrufen · Mail · Bearbeiten | vorhanden | OK |
| Ketten / ersetzt | durchgestrichen + Chip | vorhanden | an Datensatz prüfen |
| Mobil | Karten + Swipe | `SwipeRow` | Gestik gegen Mock prüfen |
| Kein Board | — | Board entfernt | OK |

**App-Pfad:** `/vorgaenge`

---

## 5. Vorgang-Detail (alle 4 Typen)

### 5.1 Gemeinsame Schale

| Element | Mock | App | Abweichung |
|---|---|---|---|
| Tabs | **Übersicht · Leistungen · Zahlung · Akte · Aktivität** | identisch | OK |
| Default-Tab | Leistungen | Leistungen | OK |
| Primary CTA | ein grüner Button statusabhängig | `primaryCta` | Labels je Status gegen Mock |
| ⋯ Menü | Weitere Aktionen | vorhanden | Inhalt je Typ prüfen |
| WV-Chip | editierbar | „WV setzen“ / Chip | OK (N6 geklickt) |
| Next-Step-Bar | Hinweis + Kennzahlen | vorhanden | Copy gegen Mock |
| QuickBar Mobil | unten / sticky | vorhanden | Sticky/Thumb-Zone prüfen |
| Akte | nur Dateien + Notizen (eine Ebene) | so | kein Segment Zahlung/Kunde — OK laut Katalog |
| Altes „Vor Ort“-Tab | weg | weg | OK |

**App-Pfade:**  
`/anfragen/[id]` · `/angebote/[id]` · `/auftraege/[id]` · `/rechnungen/[id]`

### 5.2 Leistungen-Tab

| Element | Mock | App | Abweichung |
|---|---|---|---|
| Tabelle Positionen | Bezeichnung · Menge · Preis · Status + Optionen | Spalten-⋯ + Persistenz | OK nach N4 |
| Drawer / Sheet bearbeiten | LeistungDrawer | vorhanden | Pixel/Spacing prüfen |
| Regie-Kennzeichnung | Badge / Chip | Badge + auf RE Chip | OK nach N4 |
| Tagebuch aus Position | Einstieg aus Zeile | verdrahtet (N3); Mobil schwächer im Sample | UX gegen Mock |
| Nachtrag | Band / Aktion | sichtbar (N6) | Persistenz/Flow visuell prüfen |

### 5.3 Zahlung-Tab

| Element | Mock | App | Abweichung |
|---|---|---|---|
| Anfrage | drei Zustände leer / geplant / vorhanden | `AnfrageZahlungTab` | OK nach N4 |
| Auftrag/Angebot | Plan + RateDrawer | vorhanden | OK |
| Rechnung erstellen / Abschläge | CTAs | „Rechnung erstellen“, „Abschläge“ (N6) | OK |
| Mahnung | Drawer-CTA | Primary „Mahnung senden“ → Sheet „Mahnung“ auf überfälliger RE | OK nach N4/N6 |

### 5.4 Abnahme / Schreiben

| Element | Mock | App | Abweichung |
|---|---|---|---|
| Abnahme | Document-Canvas, 3 Schritte | `/auftraege/.../abnahme/erstellen` | OK erreichbar |
| Signatur | Feld / Pad im Mock | Ort/Datum-Proxy, **kein Pad** | **bewusst Gap** |
| Angebot/Rechnung schreiben | Canvas 2-Spalten | DocumentCanvas | Meta/Summen sticky gegen Mock |

---

## 6. Surfaces (wie „Fenster“ sich anfühlen)

| Job | Mock | App | Abweichung |
|---|---|---|---|
| Kurzformular | Sheet rechts (Desktop) / Bottom (Mobil) | `EditorSheet` | Breiten 560px vs. Mock stichproben |
| Dokument (Angebot/RE/Abnahme) | Full Canvas | `DocumentCanvas` | 2-Spalten Desktop / Vollbild Mobil |
| Alte Multi-Step-Wizards | weg | `WizardShell` gelöscht | OK |
| Center-Modal Vorgang | weg | auf Sheet umgestellt | Namensreste „Modal“ ignorieren |

---

## 7. Dashboard

| Element | Mock | App | Abweichung |
|---|---|---|---|
| „Meine Arbeit“ zuerst | Inbox vor Charts | `MyWorkInbox` | OK strukturell |
| Karten Anfragen/Angebote/Aufträge/RE | vorhanden | vorhanden | KPI-Copy/Fehlerzustände („Fehler“-Buttons im Sample) prüfen |

**App-Pfad:** `/`

---

## 8. Flows — Verhalten (nicht nur Look)

Aus N6-Durchklick (Desktop/Mobil):

| Flow | Ist-Klick | Design-Notiz |
|---|---|---|
| Anfrage → Angebot → Annehmen | funktioniert | „Versenden“-Label am Angebot oft unsichtbar / anders benannt — Copy-Abgleich |
| Auftrag → Doku → Abnahme | teilweise | Abnahme OK; **Handwerker anfragen** und **Abschließen** am Sample nicht gefunden — fehlt oder falsch benannt? |
| Rechnung → Zahlplan → bezahlt | funktioniert | OK |
| Nachtrag / Gutschrift | funktioniert | Gutschrift unter ⋯ „Gutschrift (Teil/Kulanz)“ |
| WV | funktioniert | OK |
| Mahnung | funktioniert | nur wenn RE offen/überfällig — statusrichtig |
| Notfall | **fehlt im FAB** | Mock/Spec erwarten Direktauftrag; heute Code-Pfad woanders |
| Duplikat / Reklamation | am Sample nicht sichtbar | Mock-Zustände fehlen oder UI versteckt |

---

## 9. Was du dem Designer als „Passend“ abnehmen kannst

Strukturell Mock-nah und reviewbar:

1. Vorgänge-Liste mit Phasen-Chips + Wartung & Pflege  
2. Einheitliche Detail-Schale: 5 Tabs, Default Leistungen  
3. Header: WV · Status · Primary · ⋯ · Next-Step  
4. Leistungen-Tabelle + Drawer-Idee  
5. Zahlung inkl. Anfrage-Zustände + Mahnung-Sheet  
6. Abnahme als Canvas (ohne altes Abschluss-Modal)  
7. Nav ohne Partner, Handwerker-Label  
8. Brand-Grün + weißer Canvas  

---

## 10. Was du als Design-Schuld / Review-Prio markieren solltest

| Prio | Thema | Frage an Design |
|---|---|---|
| P0 | Pixel/Typo/Spacing | Wirkt die App noch „Legacy“ neben dem Mock? Wo weicht Schrift/Abstand sichtbar ab? |
| P0 | FAB Notfall | Soll Notfall im Neu-Menü stehen? Welche Zeile/Icon/Copy? |
| P1 | Handwerker anfragen | Wo sitzt der CTA im Mock (Leistungen-Zeile, Header, ⋯)? Label? |
| P1 | Angebot versenden | Primärbutton-Text im Mock vs. App |
| P1 | Signatur Abnahme | Pad vs. Ort/Datum — bewusste Vereinfachung oder Nachzug? |
| P2 | Duplikat-Band / Reklamation | Welche leeren/gefüllten Zustände zeigen wir? |
| P2 | Mobil Doku/Tagebuch | Accordion/CTA wie Leistungen-Tabelle im Mock? |
| P2 | PDF-Buttons | Wo im Mock die Druck-CTAs — in der App teils nur API |

---

## 11. Bewusst nicht Mock-Pixel (ehrlich)

- Kein Anspruch auf **Pixel-1:1** aller Screens (wurde in der Umsetzung selbst so protokolliert).  
- PDFs: Angleichung an Mock-Vorlagen, **nicht** pixelgleiche HTML-Mock-PDFs.  
- Alte `ENTWICKLER-SPEC.md`-Tabs (Stammdaten/Details/Verlauf/…) sind **überholt** — verbindlich für diese Welle ist der Mock/Katalog mit **Übersicht · Leistungen · Zahlung · Akte · Aktivität**.  
- Handwerker-Portal / Schicht-Gate: außerhalb dieser Welle.

---

## 12. Checkliste zum Abhaken (Designer)

### Desktop
- [ ] Sidebar + Aktivzustände  
- [ ] Vorgänge-Liste (Chips, Hover, ersetzt)  
- [ ] Anfrage × 5 Tabs  
- [ ] Angebot × 5 Tabs + Canvas schreiben  
- [ ] Auftrag × 5 Tabs + Abnahme-Canvas  
- [ ] Rechnung × 5 Tabs + Mahnung-Sheet  
- [ ] Leistungs-Drawer  
- [ ] RateDrawer / Abschläge  
- [ ] Dashboard Meine Arbeit  
- [ ] FAB Neu-Menü (Notfall?)

### Mobil
- [ ] Bottom-Nav + FAB  
- [ ] Vorgänge Karten/Swipe  
- [ ] Detail 5 Tabs sichtbar + Sticky  
- [ ] Sheets von unten  
- [ ] Canvas Vollbild + Sticky-CTA  
- [ ] QuickBar / Thumb-Zone  

---

## 13. Dateien zum Weitergeben

| Datei | Inhalt |
|---|---|
| Dieses Dokument | Designer-Soll/Ist |
| `docs/UMSETZUNGSKATALOG.md` | Phasen-Soll der Umsetzung |
| `docs/umsetzung/GESAMTABNAHME.md` | ältere Code-Abnahme (teils überholt durch N1–N6) |
| `docs/umsetzung/N1`–`N4` | Typo, Cards, Toast→Funktion, UI-Nachzug |
| `docs/umsetzung/N6-DURCHKLICK.md` | geklickte Flows |
| `docs/umsetzung/n6-evidence/` | App-Screenshots vom Durchklick |
| Mock | `Baerenwald CRM (standalone) (9).html` |

---

**Bitte zurück:** pro Abschnitt aus Kap. 3–8 ein kurzes `OK / klein / groß / fehlt` + Screenshot-Paar Mock|App nur dort, wo `groß` oder `fehlt`. Dann wissen Dev und Design genau, was noch Visuelles vs. Funktionales ist.
