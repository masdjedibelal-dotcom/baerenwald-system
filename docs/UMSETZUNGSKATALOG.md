# Umsetzungskatalog — Mock 1:1 ins produktive CRM

**Auftraggeber-Regel:** Der Mock (`Baerenwald CRM (standalone).html`) plus `ENTWICKLER-SPEC.md`
sind das **verbindliche Soll für UI, Interaktion und Flows** — ausnahmslos 1:1, auch bei Details,
die unnötig erscheinen. Das Repo enthält bewusst **mehr Daten** als der Mock zeigt; gelöscht wird
nur, was in Abschnitt „Löschliste" ausdrücklich genannt ist.

**Arbeitsweise — verbindlich für jede Phase:**

1. **Vor dem Bauen:** Abnahmekriterien der Phase als prüfbare Liste hinschreiben (nicht beschreiben).
2. **Bauen:** nur der Umfang dieser Phase. Kein Vorgriff.
3. **Nach dem Bauen:** Ist-Änderungsprotokoll ausfüllen (siehe Vorlage unten) und Abnahmekriterien
   einzeln mit Beleg abhaken (Dateipfad + Zeile oder Grep-Ergebnis).
4. **Ein Commit pro Phase**, damit ein Rückweg existiert.
5. **Vollständigkeit statt Stichprobe:** Betrifft eine Phase „alle vier Vorgangstypen", müssen alle
   vier belegt sein. Ein durchgereichtes Prop, das nirgends gelesen wird, gilt als **nicht umgesetzt**.
6. **Dann Stopp** und auf Freigabe der nächsten Phase warten.

**Nicht in dieser Welle:** Handwerker-Portal, Schicht-Gate, Mieter-/HV-Portal-UI.

---

## Vorlage: Ist-Änderungsprotokoll (pro Phase auszufüllen)

```markdown
## Phase N — <Titel>

### Abnahmekriterien (vorher definiert)
- [ ] Kriterium 1 … → Beleg:
- [ ] Kriterium 2 … → Beleg:

### Was sich am Ist geändert hat
| Datei | vorher | nachher | Art |
|---|---|---|---|
| src/… | … | … | neu / umgebaut / entfernt |

### Neu entstanden
- Komponente/Funktion · Pfad · Zweck

### Entfernt
- Was · Pfad · warum (Spec-Abschnitt)

### Bewusst nicht geändert
- Was · warum (außerhalb Phasen-Umfang / Bestand gewinnt laut Konfliktliste)

### Bekannte Abweichungen zum Mock
- Was weicht ab · warum · wann behoben
```

---

# Phase 0 — Datenmodell scharf machen

**Umfang:** Migration anwenden, Spaltenprüfung, keine UI.

### Abnahmekriterien
- Migration `20260901120000_vorgang_datenmodell_spec_w2.sql` frisch aus der Datei angewendet
- `wiedervorlage_datum` + `wiedervorlage_notiz` existieren auf `leads`, `angebote`, `auftraege`, `rechnungen`
- `ersetzt_durch`, `korrektur_von`, `korrektur_art` auf `angebote` und `rechnungen`
- `zusammengefuehrt_in` auf `leads`
- `letzte_aktivitaet` auf `auftraege`
- `notfall_verguetung` auf `aufwand` festgeschrieben (Default + Check), **nicht** gedroppt
- Partner→Handwerker-Migration gelaufen: Kategorie erhalten, `herkunft: "partner"` gesetzt, FKs umgehängt, Zeilenzahl vorher/nachher belegt
- Kein UI-Code in diesem Commit

---

# Phase 1 — Status-Semantik + Primary-CTA-Matrix

**Spec:** §5, §11 · **Warum zuerst:** gemeinsame Sprache vor jeder UI.

### Umfang
- `STATUS_TONE`-Map: alle Status aller vier Phasen → vier Töne (grau · blau · grün · rot)
- **Ein** `StatusBadge` ersetzt alle bestehenden Badge-Varianten
- Mapping-Layer Spec-UI-Status ↔ DB-Enums (keine Enum-Migration)
- **Eine** Funktion `primaryCta(phase, status, ctx)` nach Spec-Matrix §5
- Fallback für unbekannte Status (`STATUSES[x] || { label: x, kind: "neu" }`)

### Abnahmekriterien
- `primaryCta` existiert genau einmal im Repo
- Alle vier Detail-Clients rufen sie auf — vier Belege
- Kein Detail-Client enthält noch eigene CTA-Ableitung (Grep nach `kind="primary"` in Detail-Headern findet nur den Matrix-Aufruf)
- `AngebotStatusBadge`, `AuftragStatusBadge`, `mock-badge-kind.ts` und weitere Badge-Varianten sind entfernt oder leiten auf `StatusBadge` durch
- Jede Phase zeigt genau **einen** grünen Button pro Screen
- Ein unbekannter Status crasht keine Liste (Testfall belegen)

---

# Phase 2 — Flächen-System + Altlasten weg

**Spec:** §6, §15 · **Warum hier:** Solange Stepper und Center-Modals existieren, entstehen neue Flows im alten Muster.

### Umfang
- `EditorSheet`: `context === 'canvas' → center` **entfernen**. Desktop = Slide-over rechts 560px, mobil = Bottom Sheet
- `DocumentCanvas` Mock-konform: zwei Spalten (Dokument | Meta), `CollapseRow`-Metazeilen mit Zustandsanzeige, Summenblock sticky am unteren Rand der Meta-Spalte, mobil gestapelt + Sticky-Footer-CTA
- **`WizardShell.tsx` löschen** samt aller Nutzungen — jetzt, nicht am Ende
- **Alle zentrierten Desktop-Modals im Vorgangs-Kontext** auf Sheet umstellen
- Canvas gilt für: Angebot, Rechnung, Abnahme, Abschlussbericht. Sheet für: Anfrage, Objekt, Position, Rate, Leistung, Stammdaten

### Abnahmekriterien
- `WizardShell` existiert nicht mehr; Grep findet null Referenzen
- Grep nach `center`/`justify-center` in Overlay-Komponenten findet nichts im Vorgangs-Kontext
- Jeder Dialog ist entweder Canvas oder Sheet — Liste aller Overlays mit Zuordnung
- Canvas hat auf Desktop zwei Spalten, Meta-Spalte scrollt, Summenblock klebt unten
- Mobil: Canvas Vollbild mit Sticky-Footer-CTA, Sheet als Bottom Sheet
- Kein Stepper, keine Schrittzähler irgendwo

---

# Phase 3 — Navigation

**Spec:** §3

### Umfang
- Sidebar: **Arbeit** = Dashboard · Vorgänge · Kunden · Handwerker · **Organisation** = Kalender · KI Analytics · **unten abgesetzt** Einstellungen
- Label „Partner" → „Handwerker" überall
- Route `/partner` und Nav-Einstieg entfernen (Tabelle bleibt)
- Bottom-Nav: Dashboard · Vorgänge · **+** · Kunden · Mehr — Kalender wandert in „Mehr"
- Gruppe „Planung" → „Organisation", „KI" → „KI Analytics"

### Abnahmekriterien
- Sidebar entspricht exakt der Spec-Reihenfolge und Gruppierung — Screenshot-Vergleich mit Mock
- Grep nach „Partner" findet keine Nav-, Route- oder Create-Einträge mehr
- `/partner` gibt 404 oder leitet auf `/handwerker`
- Bottom-Nav zeigt fünf Einträge in Spec-Reihenfolge
- Aktiv-Markierung funktioniert für Kunden- und Handwerker-Detailseiten

---

# Phase 4 — Vorgänge-Liste

**Spec:** §3, §14

### Umfang
- Eine Tabelle für alle vier Phasen
- Chips: Alle · Anfrage · Angebot · Auftrag · Rechnung · **Wartung & Pflege** (Wortlaut verbindlich, nicht „Wiederkehrend")
- Toggle **Offen/Erledigt** mit Zählern
- Rechts: Filter-Icon · Spalten-Icon · Export-Icon
- Spalten: Kunde · Vorgang · Phase · Wert · Datum · Status (kein Datum-Zeitanteil)
- Ketten-Darstellung: ersetzte Dokumente ausgegraut, Titel durchgestrichen, Chip „ersetzt"
- Desktop: Hover-Schnellaktionen (Anrufen · Mail · Bearbeiten), Aggregatzeile (Anzahl · offen · Summe · Auswahl), Randmarkierung (rot bei überfällig/Notfall, gelb bei neu/versendet), `row-flash` nach Statuswechsel
- Mobil: Karten-Stapelung, Swipe links Löschen mit Undo, Swipe rechts Anrufen
- Checkboxen dauerhaft sichtbar, Header-Checkbox für Alle

### Abnahmekriterien
- Kein Board, kein Board-Flag, keine Zeilenhöhen-Umschaltung
- Keine Aktion-Spalte („Wartet auf Freigabe") — Grep-Beleg
- Chip heißt wörtlich „Wartung & Pflege"
- Spalten-Toggle: ausgeblendete Spalte kollabiert wirklich, keine verschobenen Zellen (alle Kombinationen prüfen)
- Ersetztes Dokument in der Liste sichtbar mit Chip — Beleg an echtem Datensatz
- Undo im Lösch-Toast stellt die Zeile wieder her

---

# Phase 5a — Detail-Shell (nur Auftrag)

**Spec:** §4 · **Warum getrennt:** eine Phase zuerst richtig, dann kopieren.

### Umfang
- Fünf Tabs: **Übersicht · Leistungen · Zahlung · Akte · Aktivität** — Default **Leistungen**
- Tabs zuerst mit Platzhaltern verdrahten, Inhalte in späteren Phasen
- Gruppen-Id einheitlich `leistungen` (nicht `ausfuehrung`)
- Shell fällt bei unbekanntem Default-Tab auf den ersten zurück
- Mobil: Unterstrich-Tabs, sticky, alle fünf gleichzeitig sichtbar
- Auftrag-Tab „Vor Ort" / `ausfuehrung` **entfällt**

### Abnahmekriterien
- Fünf Tabs in Spec-Reihenfolge, Default `leistungen` aktiv beim Öffnen
- Jeder Tab rendert Inhalt (kein leerer Bereich) — fünf Belege
- Unbekannter Default-Tab führt nicht zu leerer Fläche (Testfall)
- Kein `ausfuehrung`, kein „Vor Ort" mehr als Tab
- Mobil alle fünf Tabs sichtbar, aktiver mit 2px Unterstrich

---

# Phase 5b — Detail-Shell auf Anfrage, Angebot, Rechnung

### Abnahmekriterien
- Alle vier Typen: identische Tab-Reihenfolge, identische Labels, Default `leistungen`
- Vier Belege, dass jeder Tab in jedem Typ Inhalt rendert (20 Kombinationen)
- Keine typspezifischen Sondertabs mehr

---

# Phase 5c — Header-Chrome

### Umfang
- Header: Titel · **WiedervorlageChip** · Status-Badges · Primary-CTA · ⋯ (CTA und ⋯ rechtsbündig, immer)
- **NextStepBar** darunter: nächster Schritt + Kontexthinweis + zwei bis drei Kennzahlen je Typ
- Mobil: **QuickBar** (Anrufen · Mail · Notiz · Foto)
- ⋯-Menü enthält **nur**: Statuswechsel · Bearbeiten/Kopieren · Löschen (rot, unten)
- Kontakt und Portal-Zugang in die Stammdaten-Karte, nicht ins Menü
- Mobil: Header sticky, schrumpft nach 40px Scroll; Primary-CTA als fixe Leiste über der Bottom-Nav

### Abnahmekriterien
- Vier Typen haben Chip, NextStepBar und ⋯ an identischer Stelle
- ⋯-Menü enthält keine Kontakt-, Portal- oder Notfall-Einträge mehr — Grep-Beleg
- Portal-Zeile in der Stammdaten-Karte zeigt Zustand (aktiv/eingeladen/nicht registriert) mit passender Aktion
- Mobil: Header schrumpft, QuickBar sichtbar, CTA über der Bottom-Nav
- Scroll-Container hat Bodenfreiheit (Desktop 96px für FAB, mobil Bottom-Nav + Safe-Area + 28px) — kein Inhalt hinter fixen Leisten

---

# Phase 5d — Akte auf eine Ebene

### Umfang
- Akte = **Dateien + Notizen** in einem Screen, untereinander
- Segmente **Zahlung** und **Kunde** entfallen (Zahlung wird eigener Tab, Kunde steht in Übersicht)
- Dateien-Seeds über alle vier Phasen konsistent

### Abnahmekriterien
- Kein Segment-Umschalter in der Akte — Grep-Beleg
- Zahlung erscheint nicht mehr in der Akte
- Alle vier Typen zeigen Dateien und Notizen untereinander

---

# Phase 6 — Leistungen (Kernobjekt)

**Spec:** §7

### Umfang
- **`LeistungenTab`** — eine Tabelle für alle Phasen. **Sie liest, sie schreibt nicht:** Positionen ändern heißt das zuständige Dokument öffnen (Angebot bzw. Rechnung)
- Spalten: Bezeichnung · Menge · Preis · Status. Phase setzt das Default-Set, Nutzer entscheidet über ⋯
- Zeile → **`LeistungDrawer`**: Lese-Abschnitte (Position · Zuweisung · Dokumentation · Abnahme), Sekundäres hinter „Alles anzeigen", **Aktionen ausschließlich als Footer-CTAs**
- Mehrfachauswahl → Sammelaktionen (Zuweisen · Erledigt · Termin), **nur beim Auftrag**
- Handwerker-Zuweisung = **Anfrage mit Konditionen** (EK, Zeitraum, Nachricht), nicht stille Zuordnung
- Bautagebuch-Einträge liegen im Drawer unter „Dokumentation"; freier Eintrag als Button unter der Tabelle. **Kein Tagebuch-Tab, kein Segment-Umschalter**
- Mängel aus der Abnahme als offene Punkte mit Frist über der Tabelle
- Mobil: Karten-Stapelung mit Menge/Preis als beschriftete Zeilen

### Abnahmekriterien
- Eine Komponente für alle vier Phasen — vier Belege
- Kein „+ Position", kein Positions-Editor, kein Gewerk-Hinzufügen in der Tabelle (Grep-Beleg)
- Drawer: Aktionen nur im Footer, kein Eingabefeld zwischen Lese-Zeilen
- Sammelaktionen erscheinen nur beim Auftrag
- Tagebuch nirgends als Tab oder Segment
- Mängel-Karte im Leistungen-Tab mit Frist und Status (offen/überfällig/behoben)

---

# Phase 7 — Zahlung

**Spec:** §9

### Umfang
- Eigener Tab mit drei Zuständen: **leer** (CTA „Rechnung erstellen") · **Einzelrechnung** (eine Zeile) · **Abschlagsplan** (Ratentabelle mit Fortschritt und „Als nächstes"-Markierung)
- Zeile → **`RateDrawer`**: Abschlag · Rechnung · Zahlung · Mahnungen · Reklamation als Lese-Abschnitte, Aktionen als Footer-CTAs
- Statusabhängige CTAs: geplant → Rechnung erstellen · gestellt → Als bezahlt / bearbeiten / nochmal senden / Mahnung / Reklamation · bezahlt → Gutschrift / Zahlung zurücksetzen
- Mahnwesen **ohne neuen Status**: Badge „Überfällig" → „Mahnstufe 1/2/3", Verlauf im Drawer
- Reklamation nur wenn eine Rechnung existiert
- **Prefill** aus `angebote.zahlungsplan` im Rechnungs-Canvas; Nutzer entscheidet dort neu
- `auftraege.zahlungsplan` wird **nicht mehr gelesen**
- Schlussrechnung zieht geleistete Abschläge ab: *Gesamtsumme · ./. geleistete Abschläge · Restbetrag*

### Abnahmekriterien
- Drei Zustände einzeln belegt (leer / Einzelrechnung / Plan)
- Grep: `auftraege.zahlungsplan` wird nirgends mehr gelesen
- Abschläge-Abzug erscheint in Summenblock **und** Kundenvorschau
- „Rechnung bearbeiten" und „Gutschrift" öffnen wirklich den Canvas mit richtigem Modus — nicht nur Toast
- Mahnstufe erhöht sich sichtbar in Zeile und Drawer
- Reklamation bei Status *geplant* nicht anwählbar

---

# Phase 8 — Abnahme → Abschluss

**Spec:** §8

### Umfang
- **Ein Weg:** Abnahme-Canvas mit drei Schritten (Checkliste & Ergebnis · Angaben · Prüfen & PDF)
- Bei vorhandener Signatur heißt der CTA **„Abnahme speichern & Auftrag abschließen"**
- **Gate:** Warnung bei undokumentierten Positionen („n von m … als Abnahme unter Vorbehalt vermerken") — kein harter Block
- Mängel aus der Abnahme werden offene Punkte mit Frist (siehe Phase 6)
- **`AbschlussdokumentationModal` und `AuftragAbschlussFlowClient` entfernen**
- „Auftrag abschließen" im CTA und im ⋯ führen beide in denselben Canvas

### Abnahmekriterien
- Grep: kein Abschluss-Modal mehr im Repo
- Beide Einstiege („Auftrag abschließen", „Abnahme starten") landen im gleichen Canvas
- Gate erscheint bei undokumentierten Positionen und verschwindet bei vollständiger Doku
- Abschluss setzt Auftragsstatus und bietet Undo im Toast

---

# Phase 9 — Regie und Notfall

**Spec:** §10

### Umfang
- Regie ist **Positionsart** (`typ: regie`), kein Auftragstyp: „geschätzt 4 h × 69 €/h", Badge „nach Aufwand"
- Rechnung: Regie-Zeilen vorbefüllt aus Bautagebuch-Zeiten, Regieschein als Anlage-Chip, dezente Zeile „geschätzt 4:00 / erfasst 3:05"
- **Notfall:** Direktauftrag **ohne Angebot** mit Regie-Positionen. **Kein Betrags-Deckel.** Nur Aufwand (`notfall_verguetung = aufwand`)
- Notfall-Modal an Mock angleichen: Handwerker zuordnen · Vergütung nach Aufwand (Stundensatz + Materialaufschlag) · Leistungsumfang als Stichpunkte · „Beauftragen"
- Kein Festpreis-Zweig im Notfall
- Partner-seitige Sprache: **„nach Aufwand"**, nie „Regie". CRM-intern und in Dokumententiteln „Regie"

### Abnahmekriterien
- Grep: keine Deckel-Logik, keine „max. €"-Anzeige im Notfall
- Notfall-Modal hat keinen Festpreis-Zweig
- Regie-Position zeigt Stunden × Satz und Badge „nach Aufwand"
- Rechnung übernimmt Zeiten aus dem Bautagebuch mit Schein-Referenz
- Grep: partnerseitige Texte enthalten kein „Regie"

---

# Phase 10 — Alltagsfunktionen und Dashboard

**Spec:** §12, §13

### Umfang
- **Wiedervorlage-Chip** im Detail-Header aller vier Typen: Schnellwahl (Morgen · 3 Tage · Woche · 2 Wochen) + Datum + Notiz; fällig → gelb
- **Duplikat-Band** im Anfrage-Detail: gleiche Tel/Mail oder gleiches Objekt in 30 Tagen → Hinweis + „Zusammenführen" (Ziel wählen, Doppelter bleibt als zusammengeführt sichtbar). Nutzt `duplikat_hinweis` als Quelle, ergänzt `zusammengefuehrt_in`
- **Nachtrag** über Auftrag-⋯ → Angebots-Canvas mit `nachtragZu`: Titel „Nachtrag erstellen", Hinweisband „erweitert den bestehenden Auftrag — ersetzt ihn nicht", Bezug beim Speichern
- **Undo in Toasts** statt Bestätigungsdialogen bei jeder zustandsändernden Aktion
- **Dashboard:** „Meine Arbeit" **zuerst**, vor allen Charts — Anfragen ohne Antwort · Stille Angebote · Aufträge ohne Fortschritt (>10 Tage seit `letzte_aktivitaet`) · RE überfällig. Jede Zeile klickbar. Danach KPI-Karten mit Zeitfilter, dann Umsatzverlauf · Funnel · Umsatz nach Gewerk · Top-Ranking

### Abnahmekriterien
- Chip in allen vier Typen, Zustand „fällig" farblich unterschieden
- Duplikat-Band an echtem Datensatz belegt; Zusammenführen setzt `zusammengefuehrt_in` und lässt den Doppelten sichtbar
- Nachtrag: `nachtragZu` wird im Canvas **gelesen** (Titel + Band) und beim Speichern verarbeitet — nicht nur übergeben
- „Aufträge ohne Fortschritt" rechnet gegen `letzte_aktivitaet`, nicht gegen Startdatum — Beleg: ein Auftrag mit hohem Fortschritt wird **nicht** gezählt
- „Meine Arbeit" steht im ersten Viewport, Charts darunter

---

# Phase 11 — Frontend-Feinschliff

**Spec:** §14

### Umfang
- Typo-Skala auf **vier Größen**: 12 (Meta) · 13,5 (Text) · 15 (Titel) · 19 (Überschrift)
- Weißraum: Karten-Padding 20px, Kartenabstand 16px, Prop-Zeilen 11px
- Borders 0,5px, **ein Rahmen pro Bereich** — keine Card-in-Card
- Mobil: Detail-Header schrumpft (`.shrunk`), Tastatur-Erkennung (`kb-open` blendet Sticky-Elemente aus), Tabellen zu Karten, Swipe-Aktionen
- Desktop: Hover-Schnellaktionen, Aggregatzeile, Randmarkierung, `row-flash`
- **Combobox statt Select** bei mehr als 15 Optionen (Kunden, Handwerker, Leistungen) mit Tipp-Filter und Kontext-Subline
- Tastenkürzel: ⌘K · ⌘J · n · / · ? · Esc
- Leerzustände mit Aktion, nicht nur Text

### Abnahmekriterien
- Grep nach Schriftgrößen findet nur die vier erlaubten Werte in Vorgangs-Komponenten
- Keine verschachtelten Karten mit doppeltem Rahmen — Screenshot-Vergleich
- Jedes Auswahlfeld mit >15 Optionen ist Combobox — Liste aller betroffenen Felder
- Alle Kürzel funktionieren; `?` zeigt die Übersicht
- Bei offener Tastatur (mobil) sind Bottom-Nav, FAB und Sticky-CTA ausgeblendet

---

# Phase 12 — PDF-Exporte

**Spec:** §16

### Umfang
- Vier Dokumente an die Mock-Vorlagen angleichen: **Aushang** (Mieter, QR, HV-gebrandet, einseitig) · **Regiebericht** (Zeiterfassung · Tätigkeiten · Material · Fotos · Soll/Ist · §35a) · **Bautagebuch** (zweistufig je Tag → je Position) · **Angebot/Rechnung**
- Beide Berichte aus **einem** Datenbestand (Positions-Dokumentation + Schichten)

### Abnahmekriterien
- Jedes Dokument passt auf die vorgesehene Seitenzahl (Aushang einseitig, geprüft im Druckdialog)
- Regiebericht und Bautagebuch speisen sich aus derselben Quelle — kein zweiter Datenpfad
- Rechnung enthält §35a- und §13b-Hinweise, wenn gesetzt

---

# Phase 13 — Löschliste durchziehen

**Spec:** §15 plus Korrekturen. `WizardShell` und Center-Modals sind bereits in Phase 2 entfernt.

### Entfernen
| Was | Anker im Repo |
|---|---|
| Partner-Route und Nav-Einstieg | `src/app/(dashboard)/partner/**`, `nav-config.ts` |
| „Auftrag anlegen" als Einstieg und Copy | `naechste-schritte.ts`, Angebots-UI-Texte |
| Vertrag/Wartung als **Phase im Verlauf** | Verlaufs-Komponenten |
| Board-Reste, Aktion-Spalte, Zeilenhöhen-Umschalter | Listen-Komponenten |
| Akte-Segmente Zahlung/Kunde | `VorgangAkteTab.tsx` |
| Auftrag-Tab `ausfuehrung` / „Vor Ort" | `AuftragDetailClient.tsx` |
| Separates Abschluss-Modal | `AbschlussdokumentationModal.tsx`, `AuftragAbschlussFlowClient.tsx` |
| Notfall-Deckel-UI | `NotfallDirektBeauftragenModal.tsx` |
| Tagebuch als CRM-Tab | Baustelle-Tab-Komponenten |
| Verwaiste Komponenten aus dem Umbau | nach Grep-Analyse |

### Nicht löschen
HV-/Portal-Daten · Provisionen · Freigabe-Schwellen · Objekte und Einheiten · `partner`-Tabelle
(nach Migration) · alle Bautagebuch-**Daten**tabellen · Vertrag-PDF und Turnus-Felder ·
Handwerker-Portal komplett

### Abnahmekriterien
- Grep-Beleg für jede Zeile der Entfernen-Tabelle: null Referenzen
- Grep-Beleg für die Nicht-löschen-Liste: alles noch vorhanden
- Kein toter Code: verwaiste Komponenten identifiziert und entfernt (Liste mit Zeilenzahl)
- Build ohne Warnungen zu unbenutzten Importen

---

# Gesamtabnahme

Erst nach Phase 13. Liefere ein Abnahmeprotokoll mit vier Teilen:

### 1. Phasen-Übersicht
Tabelle: Phase · Status · Commit · Abweichungen · offene Punkte

### 2. Mock-Abgleich
Screenshot-Vergleich Mock ↔ Umsetzung für: Vorgangsliste · alle vier Detail-Typen mit allen
fünf Tabs · Angebots-Canvas · Rechnungs-Canvas · Abnahme-Canvas · Leistungs-Drawer ·
RateDrawer · Dashboard — je Desktop **und** mobil. Abweichungen benennen und begründen.

### 3. Durchklick-Protokoll
Beide Ansichten, alle Flows von Anfang bis Ende:

- Anfrage anlegen → Angebot erstellen → versenden → annehmen → Auftrag
- Auftrag: Handwerker anfragen → Positionen dokumentieren → Abnahme → abschließen
- Rechnung: erstellen (Einzel **und** Zahlplan) → versenden → bezahlt
- Korrekturen: Angebot überarbeiten · Nachtrag anlegen · Rechnung korrigieren · Gutschrift
- Sonderfälle: Notfall-Direktauftrag · Duplikat zusammenführen · Mahnung · Reklamation · Wiedervorlage

Je Flow: funktioniert / bricht ab / weicht ab, mit Beleg.

### 4. Gesamt-Ist-Änderungsprotokoll
Konsolidiert über alle Phasen: neue Dateien · umgebaute Dateien · gelöschte Dateien ·
Datenmodell-Änderungen · bewusst nicht Umgesetztes mit Begründung.

### Abnahmekriterien Gesamtabnahme
- Alle 14 Phasen abgeschlossen und einzeln abgenommen
- Kein Punkt der Spec ohne Beleg (Umsetzung oder begründete Abweichung)
- Alle vier Vorgangstypen vollständig durchklickbar, Desktop und mobil
- Löschliste vollständig abgearbeitet, Nicht-löschen-Liste unangetastet
- Keine Konsolenfehler in irgendeinem Screen
- Migration angewendet, Daten konsistent
