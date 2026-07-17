# Entscheidungslog — Autonomer Durchlauf Nr. 1–11

Format: **Frage** | Optionen | **gewählt** | Begründung

---

## Aktionen-Popover + Zurück-Crumb Mock 1:1 (2026-07-17)

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Menü-Quelle | Ad-hoc Items / **`buildEntityMenu`** | **entityMenu** Anfrage + Auftrag | Standalone Mock; gleiche Reihenfolge Liste/Detail |
| Desktop-Panel | `menu-panel` / **`.menu`** | **`.menu` + `.menu-item`** | Mock Standalone `Menu`-Komponente |
| Sep vor Admin Login | wie Mock-JS / **wie Screenshot** | **kein Sep** (Edit/Copy/Portal eine Gruppe) | Mock-Screenshot Anfrage-Detail |
| „Als Projekt weiterführen“ | im ⋯-Menü / **weg** | **weg** | nicht im Mock-Menü |
| Löschen-Farbe | nur Text / **Text+Icon rot** | **`.menu-item.danger` + Icon inherit** | Mock: trash rot |
| „Als verloren“ | danger / **normal** | **normal** | Nur Löschen ist danger |
| Zurück-Link | versteckt / **MockDetailCrumb** | **`EntityDetailLayout` + Crumb** | „Zurück zu den Vorgängen · Anfragen › …“ |
| Nicht erreichbar | fehlen / **StatusModal** | **`nicht_erreichbar` + Wiedervorlage** | Mock Status-Menü |

---

## Anfrage Notizen-Tab Mock 1:1 (2026-07-17)

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Layout | Alt Compose+Note-UI / **Mock NotizenCard** | **`MockCard` + `.note` + `MockNotizComposer`** | Standalone Mock (7) |
| Composer | Textarea+Foto-Toolbar / **Chat-Composer Enter/Send** | **note-composer + note-send** | Mock: Enter senden, Shift+Enter Zeile |
| Foto-Upload im Composer | Behalten / **weglassen** | **weglassen** | Mock hat keinen Foto-Upload; bestehende Fotos bleiben sichtbar |
| Zeitstempel | DatumZeit / **Timeline-Stamp** | **`formatTimelineStamp`** | Wie Verlauf („Heute · HH:MM“) |

---

## Anfrage Dokumente-Tab Mock 1:1 (2026-07-17)

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Layout | Alte Tabelle / **Mock `DokumenteCard`** | **`MockDokumenteCard` + Dropzone + `dok-list`/`list-row`** | Standalone Mock (7) |
| Freigabe | Nur Anzeige / **Checkbox Kunde/intern** | **Checkbox** wie Mock | UI-State lokal (kein DB-Feld) |
| Beschreibung/Name-Edit | Persistenz / **lokaler Edit-Modus** | **lokal** (Bearbeiten via Modal) | Spalten fehlen in `lead_dokumente` |
| Angebote in Liste | Ausblenden / **mit anzeigen** | **mit anzeigen** (kein Löschen) | bisherige CRM-Logik |

---

## Stammdaten-Listen Mock 1:1 (2026-07-17)

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| DOM-Klassen | `list-row-grid` / **Mock `list-row` + lc-*** | **`list-row`, `lc-title`, `lc-pills`, `lc-status`, `row-actions always`** | Standalone Mock (7); Screenshots Kunden/HW/Partner |
| CSS `.list-row` | Flex (CRM-Extension) / **Grid** | **`display: grid`** | Flex brach Tabellen-Spalten; Ursache für Abweichung vom Mock |
| Auswahlmodus | Nur Highlight / **Checkbox-Spalte** | **`vg-check` / `vg-box` wie Mock** | Auswählen togglet 40px-Spalte |
| Handwerker-Bewertung | Fake-Zahlen / **„—“ + Stern** | **Platzhalter „—“** (OP-8d-04, keine DB) | Spalte bleibt sichtbar wie Mock |
| Topbar-CTA Neu | Behalten / **Entfernen** | **Entfernen** bei Kunden/HW/Partner | Mock: Neu nur FAB + Neu-Popover |

---

## Anfrage-Detail Mock HV + CTA (2026-07-17)

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| HV-Stammdaten | Volle Kundenkarte / **HV-3-Karten + schlanke Props** | **`HvMeldungKontextCards` + `AnfrageStammdatenCard`** | Mock Screenshots |
| Melder-Rolle | DB-Feld / **abgeleitet „Mieter“** | **Mieter** bei melder-Kanal/`erfassung_von` | Kein `melder_rolle`-Feld |
| Primär-CTA | Immer erstellen / **statusabhängig** | **Erstellen** · **Annehmen** wenn `angebotAnKundeGesendet` | User: versendet → annehmen |
| Annehmen-Aktion | Nur Navigation / **Accept + Auftrag** | **`acceptAngebotAndCreateAuftrag`** | Wie Angebots-Detail |

---

## Angebot Details PosBoard (2026-07-17)

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Positionen-UI | V3-Tab / **PosBoard Leistungen** | **PosBoard + showUst** | Mock: Gewerk-Gruppen, Preise, Netto/MwSt/Brutto |
| Persistenz | add/update Diff / **replaceAngebotPositionen** | **Replace-All Debounce** | analog Anfrage was_zeilen |
| Projekt-Übersicht | schwere CRM-Props / **Mock + Footer** | **Angebot · Gesamt (DB) · Erstellt · Gültig bis** | Mock extras |

---

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Stammdaten-Felder | Avatar+Kunde-Link / **Name·Tel·Mail·Region·Quelle·Eingegangen** | **wie Mock-Screenshot** | flache Props, kein Card-Border |
| Details-Übersicht | schwere CRM-Props / **MockProjektUebersicht + Footer** | **Projekt + Angebot/Gesamt/Erstellt/Gültig bis** | Mock `ProjektUebersicht` + extras |
| ⋯-Menü | CRM-Extras / **entityMenu angebot** | **Mock-Items** | siehe vorheriger Eintrag |

---

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Menü-Quelle | Ad-hoc CRM-Items / **`buildEntityMenu('angebot')`** | **entityMenu** | Mock-Screenshot: Bearbeiten·Kopieren·Portal·PDF·Anrufen·Mail·Löschen |
| CRM-Extras im ⋯ | behalten / **raus** | **raus** | Visualisierung, Verlängern, Nachfassen, Abgelehnt nicht im Mock-Menü |

---

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Layout | DetailHead only / **EntityDetailLayout** | **Crumb + DetailShell** | wie Anfrage; Mock `Zurück · Angebote › …` |
| Stammdaten | KundenStammdatenCard / **Mock-Props** | **`AngebotStammdatenCard`** | Mock: Avatar, Tel, Mail, Region, Kundenakte |
| Nächste Schritte | behalten / **entfernen** | **entfernen** | nicht im Mock |
| Handwerker-Versand | Stammdaten-Card / **entfernen** | **entfernen** | Mock ohne „An Handwerker senden“ |
| Kunden-Versand | Stammdaten-Block / **Modal via CTA** | **Modal only** | Primary „Angebot versenden“ bleibt |

---

## Anfrage Details Live-Funnel + Mock (2026-07-17)

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Live-Funnel-Felder | weglassen (Mock-pur) / **zusätzlich im Prop-Design** | **`extraRows` + `footerRows`** | Nutzer: Live-Daten in Details, gleiches `.prop`-Inline-Design |
| Reihenfolge | nur Funnel / Mock-Kern + Extras | **Projekt → Beschreibung → Funnel → Region → Preisrahmen → Quelle → Eingegangen** | Mock-Kern bleibt; Live ergänzt |

---

## Anfrage Details-Tab Mock 1:1 (2026-07-17)

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Details-Inhalt | Funnel-Props + Objekte / **Projekt-Übersicht + PosBoard** | **`AnfrageDetailsTab`** | Mock `LeadDetailsTab` |
| Projekt-Props | Viele Funnel-Felder / **Projekt, Beschreibung, Region, Preisrahmen, Quelle** | **Mock-Props** | Positivliste + Standalone |
| Leistungen | LeadProjektWasBlock / **PosBoard „Leistungen“** | **PosBoard**, speichert `was_zeilen` | Mock PosBoard |

---

## Anfrage Verlauf Mock 1:1 (2026-07-17)

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Timeline-DOM | Tailwind dots / **Mock `tl-item`** | **`.tl-item` / `.tl-text` / `.tl-time`** | Standalone VerlaufCard |
| Hülle | Nackt / **Card „Verlauf“** | **`MockVerlaufCard`** | Mock |
| Offene Steps | Nur DB / **+ offen** | **Angebot erstellen / Auftragsbestätigung** mit `offen` | Mock LEAD_TIMELINE |
| Zeitformat | relativ „vor 2h“ / **Heute · HH:MM** | **`formatTimelineStamp`** | Screenshot |

---

## Angebot Aktivitätstab = Anfrage (2026-07-17)

| Tab | Vorher | Jetzt | Begründung |
|-----|--------|-------|------------|
| Verlauf | `LeadTimelineList` (EntityTimeline) | **`MockVerlaufCard` + `Timeline`** + Projektkontext + offene Schritte | 1:1 Anfrage |
| Dokumente | `CrmDokumenteTabelle` | **`AnfrageDokumenteTab`** (bei Lead) / Mock-Fallback | Upload + Liste wie Anfrage |
| Notizen | Platzhalter „Keine Notizen“ | **`AnfrageNotizenTab`** (Lead-Notizen) | Gleiches Composer-/Listen-Design |

---

## Auftrag Stammdaten = Mock Kontaktkarte (2026-07-17)

| Tab | Vorher | Jetzt | Begründung |
|-----|--------|-------|------------|
| Stammdaten | Auftragsdaten + KundenStammdaten | **`AuftragStammdatenCard`** (Name/Tel/Mail/Region/Quelle/Eingegangen) | Mock OrderDetail |
| Details | nur Positionen | **Auftragsdaten + Kundenstammdaten + Positionen** | Live-Blöcke verschoben |

---

## Auftrag Details = Mock (2026-07-17)

| Block | Inhalt | Begründung |
|-------|--------|------------|
| Auftragsdaten | Auftrag · Beginn · Ende · Projektleitung · Auftragswert (grün) | Mock OrderDetail |
| Projekt-Übersicht | Projekt · Beschreibung · Region · Preisrahmen · Quelle · Zeitraum · Fortschritt | wie Anfrage/Angebot |
| Leistungen | **PosBoard** (`replaceAuftragPositionenFromPosBoard`) | Mock; ersetzt Positionen-Steuerung in Details |
| Kundenstammdaten | entfernt aus Details | gehört nicht in Mock-Details |

---

## Dashboard Mock 1:1 (2026-07-17)

| Element | Funktion | Entscheidung |
|---------|----------|--------------|
| Doppel-Topbar | Mobile+Desktop `.topbar` parallel | **Ursache:** unlayered `.topbar{display:flex}` schlug Tailwind `hidden`/`md:hidden` → **eine** TopBar |
| Sektion Aufgaben | Offene Anfragen / >48h / Termine | **entfällt**, Daten bleiben (Kalender/Vorgänge) |
| Kennzahlen ±% | Vorwochen-/Monats-Vergleich | **entfällt**, Rohdaten weiter in DB |
| Auftraggeber-Portal KPIs | Meldungen / Org-Freigabe / Portal-Leads | **entfällt**; Org-Freigabe bleibt über Vorgänge-Chip „Wartet auf Freigabe“ auffindbar |
| Letzte Aktivitäten | Aktivitäts-Feed | **entfällt**, Daten bleiben in Entities |
| Letzte Anfragen (Alt-Card) | Listen-Card | **ersetzt** durch Mock-Phase-Grid „Anfragen“ |

---

## Auftrag-Zahlplan Mock 1:1 (2026-07-17)

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Tab-Inhalt | Editor-first / **Read-View + Modal** | **Read-View + Abschlagsplan-Modal** | Freigabe A; Mock `ZahlplanCard` |
| Projektmarge im Tab | Behalten / **Raus** | **Raus** | Mock hat keine Marge hier; Margendaten bleiben über Positionen-Summary sichtbar |
| `faellig_am` je Rate | Anzeige nur / **optional im JSON-Plan** | **`faellig_am?: string \| null` (ISO)** | Rückwärtskompatibel; Anzeige sonst „—“ / Rechnungs-Fälligkeit |
| Row-Aktionen | Alle Mock / **nur echte** | **Rechnung erstellen, Als bezahlt, Zahlung zurücksetzen**; Resend → OFFENE | Kein Feature ohne Funktion |
| Header-CTA | Umbauen / **nur verifizieren** | **OK** (`abgeschlossen` → Rechnung erstellen, sonst Auftrag abschließen) | Kein Fix nötig |

---

## Design-CSS Einquelle + Mock-Primitives (2026-07-17)

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Komponenten-CSS wo? | Parallel globals+mock / Nur globals / **Nur mock-design-system.css** | **Nur `src/styles/mock-design-system.css`** | Eine Quelle; globals nur Tokens+Basis — siehe `docs/DESIGN-CSS.md` |
| Button/Chip/Card/Badge | Aliase Alt→Mock / **Mock-Klassen erzwingen, Alt löschen** | **Mock-Konvention, keine Aliase** | Aliase wären nächste Parallelwelt; Guard `scripts/check-mock-primitives.mjs` |
| Detail-Cards Collapse | Immer collapsible / **Nur explizit / Mock-flach** | **Default flach (`collapsible={false}`)**; Collapse nur bei explizitem Prop | Mock hat flache `.card`/`.card-h`; `DetailCollapsibleCard` entfernt |
| StatusBadge | Behalten / Alias / **MockBadge** | **MockBadge** (kinds: neu/aktiv/warten/fertig/storniert/plain) | StatusBadge gelöscht; Guard bricht bei Import |
| Bewusste Deltas | Angleichen / Behalten | **Behalten** | Keine Aktion-Spalte, keine KI-Blöcke, Fullscreen-Wizard, Bulkbar |

---

## Vorarbeit (vor Nr. 1)

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| DetailShell für Anfrage/Angebot/Auftrag committen vor Nr. 1? | Mit Nr. 1 mischen / Separater Commit | **In Nr.-1-Commit gebündelt** | Shared `globals.css`/`tailwind.config.ts` nicht sauber trennbar; DetailShell war bereits freigegeben — im Commit-Body als Vorarbeit vermerkt |
| Projektübersicht-Card unter Stammdaten? | Behalten / Entfernen | Entfernen | Mock hat keine Projektübersicht-Card im Stammdaten-Tab; Projekt-Kette oberhalb bleibt |

---

## Nr. 1 — Listen Welle 1

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| L6 Dots-Menü in Listen ohne bestehende Row-Actions? | Dots ohne Logik / Nur phone/WA wo möglich / Struktur-Lücke | Phone/WA in Anfragen-Liste wo Telefon vorhanden; sonst Struktur-Lücke | Regel „Kein Feature ohne Funktion“; Mock-Dots brauchen entityMenu — existiert in Listenzeilen nicht |
| L6 Dots Angebote/Aufträge/Kunden/HW/Partner | Improvisieren / Offen | Struktur-Lücke → OFFENE-PUNKTE (Nr. 2/7) | Keine List-Row-Menü-Items verdrahtet |
| L8 Sort-Icons | MockIcon / Lucide | Lucide behalten, Opacity 0.35 | Explizit freigegeben |
| L9 listcard Shadow | shadow-card / Mock `--shadow` / keiner | Border 0.5px, Radius var(--r)=13px, kein shadow-card | Mock listcard: border + radius, kein Card-Shadow |
| L10 Mobile-Pane | Mitnehmen / Zurückstellen | Zurückstellen (Nr. 11) | Auftrag: kein L10 in Nr. 1 |
| Icon-Farben in Nr. 1 vorziehen? | Ja / Nur Nr. 2 | Ja (Token `--icon-*` + `.mock-icon`) | Auftrag erlaubt Vorziehen wenn Token-Binding; sonst Screenshots unbrauchbar |

---

## Nr. 2 — Listen Welle 2

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Anfragen-Spalten Mock vs CRM | Exakt Mock / CRM-Extras behalten | **Exakt Mock** Nr.·Anfrage·Kunde·Betrag·Eingang·Status·Actions | Auftrag: Grid exakt; Bereiche/Region/Avatar aus Desktop entfernt (Mobile unverändert) |
| Angebot: Erstellt-Spalte | Eigene Spalte / Sub unter Titel | **Sub unter Titel** | Mock hat Erstellt in Subzeile, nicht als Spalte |
| Aufträge: Fortschritt ohne Wert | Balken 0 / Em-Dash | **—** wenn null/undefined | Keine Fake-Progress |
| Kunden: Umsatz/Aufträge Desktop | Behalten / Entfernen | **Entfernen Desktop** | Mock hat sie nicht; Export + Mobile behalten Daten |
| Dots in Stammdaten-/Angebot-Zeilen | Improvisieren / Leer | **Leere Actions-Zelle** | Kein Feature ohne Funktion |
| Toolbar-DOM | ListFilterBar belassen + Klassen / Komplett neu | **`.toolbar`/`.chiprow`-Wrapper** um bestehende Filter | Mock-Struktur-Klassen ohne Logikbruch |
| Mock-Chip „Angebot“ (Anfragen) | Sofort / Nr. 9b | **Pipeline `status=angebot` existiert bereits** als Filterwert | 1:1 mit `LeadStatus`; kein Resolver nötig |
| Mock Angebot-Chips fine stages (HW akzeptiert etc.) | 1:1 flat status_einfach / Resolver | **status_einfach beibehalten**; fine stages → OFFENE-PUNKTE Nr. 9b | Resolver-Phasenmodell nicht improvisieren |
| Alt-Komponenten löschen | Sofort löschen / Inventur only | **Inventur + nur null-use löschen** | Regel 4; ListToolbar bleibt verwaiste Option |

### Chip-Mapping (1:1 aus heutigen Feldern)

| Liste | Mock-Chip | CRM-Feld | Status |
|-------|-----------|----------|--------|
| Anfragen | Alle/Neu/Kontaktiert/Termin/Angebot | `leads.status` Pipeline | gebaut (CRM hat zusätzlich Anlass/Org — behalten) |
| Angebote | Alle + Status-Stufen | `status_einfach` | gebaut flat |
| Aufträge | Alle/Aktiv/Fertig | Status-Groups | gebaut analog |
| Kunden | Alle/Privat/HV/Gewerbe | Kundentyp | gebaut |
| Handwerker | Gewerke + Compliance | gewerk / compliance | gebaut |
| Partner | Kategorien | partner_kategorien | gebaut |
| Angebot fine HW/Kunde | Resolver-Phasen | — | **Nr. 9b** |


## Nr. 3 — WizardShell

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Shell-Radius Fullscreen | Mock Card-Shell / CRM Fullscreen belassen | **CRM Fullscreen + innere Tokens** | Mock-Wizard ist Overlay; CRM ist Full-Page — keine strukturelle UX-Änderung (Regel 9) |
| PosBoard jetzt | Optisch Accordion / PosBoard | **Accordion optisch** | PosBoard = Nr. 8b |

## Nr. 4 — Status-Sync

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Sync-Mechanismus | Nur Portal-API / Nur DB / Beides | **Lokal Lead-Patch + optional Portal-API** | Shared Supabase braucht lokales Update; API für Notify/Audit mit skipMieterMail |
| Storno hv_meldung_status | immer abgelehnt / nur wenn gesetzt | **nur wenn bereits gesetzt** | Spez: abgelehnt-Phase; HV-Feld nur bei HV-Pipeline |
| Bei API-Fehler | throw / warn | **warn, kein throw** | Abschluss darf nicht blockieren |


## Nr. 5 — Kanal-Fix

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Labels für hv_* | Spec-Labels | **HV-Meldung / HV-Katalog / HV manuell** | Auftrag |
| Unbekannter Kanal | Crash / Fallback | **kanalLabel() + Circle-Icon** | Nie wieder crashen |


## Nr. 6 — SQL Cleanup

Belal selbst — Cursor überspringt. Hinweis: Keine Testszenarien mit einer E-Mail in zwei Rollen bis Nr. 7 fertig.

## Nr. 7a — Admin-Flag

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Admin-Quelle | nur app_metadata / nur user_metadata | **app_metadata kanonisch + user_metadata Fallback lesen** | Spec; Legacy-Nutzer nicht ausschließen |
| Manager darf Impersonation? | ja / nein | **nein (nur admin)** | Spec Admin-Impersonation |

## Nr. 7c — Buttons „Als … öffnen“

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Sichtbarkeit | Nur Server-Reject / auch Client-Hide | **Client hide via `/api/crm/me` + Server `requireCrmAdmin`** | Spec: Nicht-Admins sehen Buttons nicht |
| Label vs Mock „Admin Login“ | Mock-Label / Spec-Labels 7c | **Spec-Labels 7c** (HV-Portal / Partner-Portal / Mieter-Ansicht) | Auftrag 7c explizit; Mock-„Admin Login“ folgt in 7d als Alias wo sinnvoll |
| Mieter | Echte Session / Status-Token-Vorschau | **Status-Token read-only** | Spec: ohne Auth-User |

## Nr. 7d — Banner + Admin Login verdrahten

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Menu-Label final | Spec-7c Langform / Mock „Admin Login“ | **Admin Login** + Hint mit Zielname | Mock entityMenu; 7c-Labels bleiben als Hint |
| Auftrag-Detail Admin Login | nur Stammdaten / auch Auftrag | **auch Auftrag** (Kunde-Impersonation) | Mock onPortal auf entity |
| Portal-Banner | eigener CRM-Commit / Sibling-Repo | **handwerks-plattform AdminViewBanner angepasst** | Banner lebt im Portal-Layout |
| Token-Tabelle remote | soft-fail belassen / Migration apply | **apply_migration remote** | One-time jti jetzt hart |

## Nr. 8a — `/neu`-Speichern Datenverlust

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Root Cause | Speichern fehlschlägt / Redirect-Race | **onDone+onClose Race** auf `/rechnungen/neu` | onClose überschreibt Detail-Redirect |
| Standalone Reload | Nur Fix Race / auch Bootstrap | **beides** | Detail blockierte Edit ohne `auftrag_id` |
| `/angebote/neu` | Wizard zurück / Legacy-Redirect bleiben | **Legacy-Redirect bleiben** | Create läuft über Anfrage; kein Wizard-Stateverlust auf dieser Route |
| Build-Regression crm-access | belassen / split | **`crm-access-server.ts`** | `next/headers` darf nicht Client-Login pullen |

---

## Konsolidierung 2026-07-16 (A0/A)

| Konflikt | Gewählt | Begründung |
|----------|---------|------------|
| `docs/ENTSCHEIDUNGSLOG.md` | **code-Clone (`9110c1a`)** | Vollständiger (Nr. 1–8a) |
| `package-lock.json` | **code-Clone** | Lockfile zum Funktionsstand |
| `src/.../anfragen/[id]/page.tsx` | **code-Clone** | Funktional + Mock-Detail |
| `src/.../formulare/[id]/vorschau/page.tsx` | **code-Clone** | — |
| `src/.../impersonation/actions.ts` | **code-Clone** | Impersonation vollständig |
| `src/.../rechnungen/wizard-actions.ts` | **code-Clone** | inkl. Standalone-Bootstrap |
| `src/.../handwerker/.../antwort/route.ts` | **code-Clone** | HW-Mail-Fix |
| `src/.../RechnungDetailClient.tsx` | **code-Clone** | Wizard-Edit ohne Auftrag |
| `src/.../RechnungWizard.tsx` | **code-Clone** | onDone/onClose-Race-Fix |

Basis-Historie: **Desktop `008fb9e`** (`fa0f59d` + Nr. 1–7d). Funktionsbaum: **Merge `9110c1a`** (Vorgänge, PosBoard, mock-design-system).

---

## Nr. 1–2 Review (Wiederaufnahme 2026-07-16)

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Split-Screen Master-Detail | Behalten / Entfernen | **Entfernen** | Vollbreiten-Liste; Zeilenklick → Detail-Route |
| Sort-Header | SortableHeader (Lucide) / MockSortHead | **MockSortHead** | Hybrid beenden |
| Status-Badges in Listen | LeadStatusBadge / MockBadge | **LeadStatusMockBadge** | Mock-Badge-Kinds |
| ListFilterBar | Sofort ersetzen / schrittweise | **Schrittweise** | Filter-Logik komplex; Toolbar-Klassen bleiben |
| ListToolbar.tsx | Behalten / Löschen | **Löschen** | OP-5 freigegeben, 0 Imports |
| MasterDetailShell-Wrapper | Sofort löschen / Ersetzungsliste | **Ersetzungsliste** | Regel 4 — siehe `docs/LISTEN-ERSETZUNG.md` |

## Nr. 3 — WizardShell verdrahten

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Shell-Integration | AppFlowScreen behalten / WizardShell | **WizardShell** in Angebot- + Rechnungs-Wizard | Mock-Stepper + MockBtn-Header; `createPortal` bleibt |

## Mock-Only Sweep 2026-07-16

| Element | getragene Funktion | Daten bleiben erhalten ja/nein | Ersatz-Zugang (Pfad oder "aktuell nirgends") |
|-------|----------|---------|------------|
| Anfrage-Detail: KI-Vertriebs-Analyse (`AnfrageDetailClient`) | Zusatz-Analysepanel im Detailkopf | ja | aktuell nirgends |
| Anfrage-Detail: ProjektKette (`AnfrageDetailClient`) | Kontextkette Anfrage→Angebot→Auftrag | ja | über direkte Detail-Routen |
| Anfrage-Liste: KI-Badge/Sparkles (`AnfragenListeClient`) | KI-Markierung in Listenzeile | ja | aktuell nirgends |
| Angebot-Detail: Verkauf-/Auftrag-Banner (`AngebotDetailPageClient`) | Status-Hinweis oberhalb Stammdaten | ja | Status/Schritte im Detailtab |
| Angebot-Detail: Org-Freigabe-Banner (`AngebotDetailPageClient`) | zusätzlicher Freigabe-Hinweisblock | ja | aktuell nirgends |
| Angebot-Detail: ProjektKette (`AngebotDetailPageClient`) | Kontextkette über Projekt | ja | über direkte Detail-Routen |
| Auftrag-Detail: TopCards (`AuftragDetailClient`) | KPI-/Top-Metrik-Karten im Stammdaten-Tab | ja | aktuell nirgends |
| Auftrag-Detail: ProjektKette (`AuftragDetailClient`) | Kontextkette Projektobjekte | ja | über direkte Detail-Routen |
| Auftrag-Detail: Notizen-Kommunikationsblock (`AuftragDetailClient`) | Mail-/Kommunikations-Historie | ja | aktuell nirgends |
| Rechnung-Detail: ProjektKette (`RechnungDetailClient`) | Kontextkette über Projekt | ja | über direkte Detail-Routen |
| Rechnung-Detail: Projektübersicht-Card (`RechnungDetailClient`) | Projektkontext in Übersicht | ja | aktuell nirgends |
| Rechnung-Detail: Aktivität-Kommunikation (`RechnungDetailClient`) | Kommunikationsliste in Aktivität | ja | aktuell nirgends |
| Kunden-Detail: KPI-Row (`KundeDetailClient`) | aggregierte Kennzahlenkarten | ja | aktuell nirgends |
| Kunden-Detail: Kommunikationskarte (`KundeDetailClient`) | Kundenkommunikation im Stammdaten-Overview | ja | aktuell nirgends |
| Kunden-Detail: Einbehalte + Offene-Posten-Sektion (`KundeDetailClient`) | Zusatzblöcke unter Rechnungen | ja | aktuell nirgends |
| Kunden-/Handwerker-Detail: Portal-Konto-Statuschip | visuelle Konto-Info im Kopf | ja | aktuell nirgends |
| Handwerker-Detail: Bewertungs-Card (`HandwerkerDetailClient`) | aggregierte Sternebewertung | ja | aktuell nirgends |
| Handwerker-Detail: Projekt-Compliance-Block in Aufträgen | Zusatz-Compliance je Auftragskarte | ja | Tab `Compliance` im Handwerker-Detail |

---

## Nr. 8a — Shell Positivliste (2026-07-16)

Format: **Element** | **Funktion** | **neuer Ort** (oder „entfällt, Daten bleiben in DB“)

| Element | Funktion | neuer Ort |
|---------|----------|-----------|
| Sidebar: Anfragen / Angebote / Aufträge | Navigation zu Phasen-Listen | Dashboard-KPIs/Phasen + Vorgänge (`activeAlso` / Deep-Links `/anfragen` …) |
| Sidebar: Rechnungen (unter Finanzen) | Navigation Rechnungs-Liste | Dashboard + Vorgänge Phase Rechnung |
| Sidebar: KI Hub | Navigation KI-Analytics | entfällt in Nav; Route `/ki-analytics` bleibt (OFFENE-PUNKTE) |
| Sidebar: Abmelden | `signOut` → Login | Mehr-Screen (`/mehr`) Button Abmelden |
| Bottom-Nav: MoreSheet (Bottom-Sheet) | Kurz-Nav + Abmelden | Mehr-Screen `/mehr` (Mock: `navigate("mehr")`); MoreSheet gelöscht |
| Neu-Popover: Auftrag → `/auftraege?neu=1` | Neuen Auftrag anlegen | `/neu?art=auftrag` (bestehender Neu-Screen) |

---

## Nr. 8b — Listen Positivliste (2026-07-16)

Format: **Element** | **Funktion** | **neuer Ort**

| Element | Funktion | neuer Ort |
|---------|----------|-----------|
| `/anfragen` Listen-UI (AnfragenListeClient) | Anfragen filtern/browsen | `/vorgaenge?phase=anfrage` (Redirect) |
| `/angebote` Listen-UI | Angebote filtern/browsen | `/vorgaenge?phase=angebot` (Redirect) |
| `/auftraege` Listen-UI | Aufträge filtern/browsen | `/vorgaenge?phase=auftrag` (Redirect) |
| `/rechnungen` Listen-UI | Rechnungen filtern/browsen | `/vorgaenge?phase=rechnung` (Redirect) |
| LegacyDemoAnfragenBanner | Demo-Leads löschen | entfällt, Daten bleiben in DB (SQL/Admin) |
| Master-Detail-Split CSS + Placeholder | Split-View Liste\|Detail | entfällt; Vollbreite Liste bzw. Detail-Route |
| ListRowQuickActions (Anfragen) | Telefon/WA-Schnellaktionen | Vorgänge entityMenu (Anrufen) wo verdrahtet |
| Phasen-Listen Filter-Chips (Pipeline/Anlass/Org/Kanal/…) | Eingrenzen | Vorgänge-Filter-Modal + Phasen-Chips |
| Aufträge `?selected=` Deep-Link | Detail ohne Zeilenklick | Detail-Route `/auftraege/[id]` |

---

## Nr. 8c — Detail-Screens Positivliste (2026-07-16)

| Element | Funktion | neuer Ort |
|---------|----------|-----------|
| Anfrage: KI-Block (`LeadGptStudioBlock`) | KI-Vertriebs-Analyse | entfällt, Daten bleiben in DB |
| Anfrage: Kommunikation in Notizen | Mail-Historie | ⋯ „Mail schreiben“ |
| Anfrage: CTAs Handwerker/Kunde/Auftrag | Funnel-Schritte | ⋯-Menü |
| Anfrage: Termine-/Nächste-Schritte-Cards | Termin & Schritte | Termin über ⋯ Status-Modal; Rest entfällt UI |
| Angebot: Tab Visualisierungen | KI-Sessions | ⋯ → `/angebote/[id]/visualisierung` |
| Angebot: Kommunikation in Notizen | Mail-Historie | ⋯ „Mail schreiben“ |
| Angebot: CTA „Handwerker einholen“ | HW-Versand | Primär „Angebot versenden“ (gleicher Anker) |
| Auftrag: Tab Compliance | Checkliste | Dokumente-Tab (Bauprojekt) |
| Auftrag: Header „Bearbeiten“ | Projekt bearbeiten | ⋯ „Bearbeiten“ |
| Auftrag: Nächste-Schritte-Card | Pipeline-Hinweise | entfällt UI; CTAs Abschließen/Rechnung bleiben |
| Rechnung: Nächste-Schritte-Card | Schritte | entfällt UI; CTAs Versenden/Bezahlt |
| Alle Details: Zurück zur Phasen-Liste | Navigation | `/vorgaenge?phase=…` |

---

## Nr. 8d — Stammdaten Positivliste (2026-07-16)

| Element | Funktion | neuer Ort |
|---------|----------|-----------|
| Kunden-Liste: ListFilterBar/Zeitraum/Umsatz-Sort | Filter/Sortierung | Mock-Listbar: Filter & Suchen, Chips, MockPager (10) |
| Kunden-Liste: Status-Badge/Interessent in Mobile | Listen-Status | entfällt UI |
| Kunden-Liste: KPI-Spalten Umsatz/Aufträge | Sort-Optionen | entfällt; Sort Name/Typ/Telefon/Email |
| Kunden-Detail: getrennte Tabs Anfragen/Angebote/Aufträge | Phasen-Übersicht | Tab „Vorgänge“ (kombiniert) |
| Kunden-Detail: Tab Organisation | HV-Portal/Org-Verwaltung | ⋯ „Organisation“ → Stammdaten-Tab-Inhalt |
| Kunden-Detail: Header E-Mail-Button | Mail an Kunde | ⋯ „Mail schreiben“ |
| Kunden-Detail: Interne Notiz in Overview | Notizen | Tab „Notizen“ |
| Handwerker-Liste: Einsatz-Banner (`?filter=einsatz`) | Deep-Link-Filter | entfällt UI |
| Handwerker-Liste: ComplianceBadge in Status-Spalte | Compliance-Anzeige | Status „Aktiv“/„Verfügbar“; Compliance-Chip + Filter „Nur zu prüfen“ |
| Handwerker-Liste: Chip „Alle“ | Gewerk-Filter | Chip „Alle Gewerke“ + Mock-Gewerke + Compliance |
| Handwerker-Detail: Tab Compliance | Nachweis-Upload | Tab „Dokumente“ |
| Handwerker-Detail: Header Bearbeiten/Rahmenvertrag | Stammdaten/Wizard | ⋯-Menü |
| Partner-Liste: Chips Partner/Netzwerk | Typ-Filter | entfällt; Kategorie-Chips laut Mock |
| Partner-Liste: PartnerTypBadge in Zeilen | Typ-Anzeige | entfällt UI |
| Partner-Detail: PartnerTypBadge / E-Mail-CTA | Typ/Mail | Kategorie-Badge; ⋯ „Mail schreiben“ |
| Partner-Detail: flache Ein-Seiten-Ansicht | Detail-Navigation | Tabs Übersicht/Stammdaten/Vorgänge/Dokumente/Notizen |

---

## Nr. 8e — Wizards Positivliste (2026-07-16)

| Element | Funktion | neuer Ort |
|---------|----------|-----------|
| Angebots-Wizard Schritt 1: Anfrage-Daten, Dokumenttyp, Fotos, KI-Viz | Zusatz-UI | entfällt UI; Daten bleiben im Lead/Entwurf |
| Angebots-Wizard Schritt 1 Label „Leistungen“ | Stepper | „Positionen · {Projekt}“ |
| Angebots-Wizard Schritt 2: Rechtliche Hinweise | §35a/13b-Toggles | entfällt UI (OFFENE-PUNKTE) |
| Angebots-Wizard Finish „Erstellen und versenden“ | Versand | „Angebot versenden“ |
| Rechnungs-Wizard Schritte Finalisieren/Versenden | Stepper | „Positionen“ / „Zahlplan“ / „Paket & Versand“ |
| Rechnungs-Wizard Schritt 2: Rechnungsdetails | Meta-Felder | Schritt 3 „Paket & Versand“ |

---

## Nr. 9a — Resolver (2026-07-16)

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Fine-Stages in `status_einfach` | Flatten auf gesendet / Behalten | **Behalten** | OP-4; Labels + Actor gesendet_kunde/kunde |
| Tests | Manuell / `test:crm-vorgang` | **6 Fixtures + Shape-Assert** | Spec: alle grün vor Nav |

## Nr. 9b — Chips auf Resolver (2026-07-16)

| Element | Funktion | neuer Ort |
|---------|----------|-----------|
| Angebot Fine-Stage-Chips (Listen) | Filter HW/Kunde-Stufen | Vorgänge Filter-Modal Status = Resolver-`unterstatus` (Phase Angebot) |
| OP-3/OP-4 | Zurückgestellt | erledigt |

---

## Nr. 9c — Vorgänge + Sidebar (2026-07-16)

| Frage / Element | Optionen | Gewählt | Begründung |
|-----------------|----------|---------|------------|
| Phasen-URL | `?phase=` / `?tab=` | **`?tab=` schreiben**, `tab` dann `phase` lesen | Redirect-Kompatibilität; neue Links einheitlich `tab` |
| Listen-Spalten | Mock inkl. Aktion | **Kunde · Vorgang · Phase · Wert · Datum · Status · ⋯** | Keine Aktion/NeedsAction-Spalte, keine Kontext-Badges in Zeilen |
| „Wartet auf Freigabe“ | Actor-Label / Badge | **Nur `badges.wartet_freigabe`** in Status-Spalte | Actor/needsAction bleiben intern (Resolver) |
| Multi-Select Bulk | Mock ohne Leiste | **Bulkbar: Export, Löschen, Öffnen (1×)** | Keine Dummy-Buttons; fehlende Bulk-Aktionen → OFFENE-PUNKTE |
| Phasen-Redirects | `/anfragen` … | **`/vorgaenge?tab=…`** | Ein Einstieg „Vorgänge“ |
| Sidebar-Nav | Getrennte Phasen + KI Hub | **Positivliste: Dashboard, Vorgänge, Stammdaten, Kalender** | KI Hub: Funktionsschutz Deep-Link `/ki-analytics`, nicht in Nav |
| PipelineKontextBadge | — | **Detail-Header** Anfrage/Angebot/Auftrag/Rechnung | Lead-Kanal/HV-Kontext sichtbar wo Lead-Daten da |
| Aktiver Sidebar-Eintrag | Grün/Weiß | **Weiße Pill, `--green-dark` Text/Icon** | `.sidebar-icon.active` + Icon inherit |

---

## Mock-Referenz v7 + Wizard-Erweiterungen (2026-07-16)

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Kanonische Referenz | v4 / v6 / **v7** | **`Baerenwald CRM (standalone) (7).html`** | Auftrag: neueste Standalone ersetzt ältere |
| Gegencheck Alt-Funktionen | Improvisieren / STOPP | **Alle 4 gefunden** (Zahlfrist, §35a EStG, Reverse-Charge §13b, Vorschau) nach Gzip-Decode des Bundles | Ohne Treffer: STOPP laut Auftrag |
| E-Mail-Versanddialog | 1:1 Mock / Delta | **Funktions-Delta** — CRM-Dialog unverändert | Explizit; Gate prüft nicht gegen Mock |
| Angebots-PDF | Redesign / Delta | **Funktions-Delta** — Renderer unverändert | Explizit; Gate prüft nicht gegen Mock |
| Angebot Doctype-Labels | einfach/projekt / einfach/komplex | **UI: Einfaches / Komplexes Angebot**; Persistenz weiter `einfach`/`projekt` | Mock-Text „Komplexes Angebot“, DB-Typ bleibt `projekt` |
| Angebot Steps | 3 / 5 | **5:** Typ & Projekt → Positionen → Finalisieren → Vorschau → Versenden | Positivliste v7 |
| Rechnung Steuer-UI | Alte Card-Labels / Mock-Checkboxen | **Mock-Texte** in Paket & Versand; PDF über `hinweis_35a` / `reverse_charge_13b` | Hinweisblöcke ein-/ausblenden in Preview + PDF |
| Umsetzung | — | **Angebot 5 Steps + Zahlfrist; Rechnung Zahlfrist (Einzel) + Steuer-Checkboxen** | Feldlogik alt (`zahlungsbedingungen` / `faellig_am` / Meta-Flags); Optik v7 |

