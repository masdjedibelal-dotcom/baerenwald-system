# Phase 13 — Löschliste durchziehen

**Spec:** §15 (ENTWICKLER-SPEC) · Katalog Phase 13

### Abnahmekriterien (vorher definiert)
- [x] Grep-Beleg für jede Zeile der Entfernen-Tabelle → siehe unten
- [x] Grep-Beleg für die Nicht-löschen-Liste → siehe unten
- [x] Verwaiste Komponenten aus dem Umbau entfernt (Liste mit Zeilenzahl)
- [x] Kein toter Partner-Nav-/UI-Einstieg; Redirect-Routen + Tabelle `partner` bleiben

### Entfernen — Grep-Belege

| Was | Anker | Beleg |
|---|---|---|
| Partner-Route / Nav-Einstieg | `nav-config.ts`, `src/components/partner/**` | `rg "href: '/partner'\|label: 'Partner'" src/lib/nav-config.ts` → leer; `src/components/partner/` entfernt; Redirect bleibt in `partner/page.tsx` + `[id]/page.tsx` |
| „Auftrag anlegen“ Einstieg/Copy | `naechste-schritte.ts`, Angebots-UI | `rg "Auftrag anlegen" src --glob '*.{ts,tsx}'` → leer; Step = „Angebot annehmen“; Accept-Modal-Copy ohne Einstieg |
| Vertrag/Wartung als Phase im Verlauf | Verlauf/Phasen | `VorgangPhasenDiagramm` / `PhaseStrip` / `VorgangPhase` nur Anfrage→Angebot→Auftrag→Rechnung; kein `vertrag`/`wartung`-Phase-ID |
| Board / Aktion-Spalte / Zeilenhöhe | Listen | `rg "boardMode\|BoardView\|rowHeight\|Aktion.?Spalte" src/components/vorgaenge` → leer (Phase 4) |
| Akte-Segmente Zahlung/Kunde | `VorgangAkteTab.tsx` | Kommentar + kein Segment-Umschalter (Phase 5d/6) |
| Tab `ausfuehrung` / „Vor Ort“ | `AuftragDetailClient` | Alias → `leistungen`; Labels `vorOrt`/`bautagebuch` → Leistungen |
| Abschluss-Modal | `AbschlussdokumentationModal`, `AuftragAbschlussFlowClient` | `rg` → leer (Phase 8) |
| Notfall-Deckel-UI | `NotfallDirektBeauftragenModal` | `rg "ohneDeckel\|max\. €" src/components/auftraege/*Notfall*` → leer (Phase 9) |
| Tagebuch als CRM-Tab | Baustelle/VorOrt | `AuftragBaustelleTab`, `AuftragBautagebuchCard`, `AuftragVorOrtPanel`-Segment-UI entfernt |
| Verwaiste Umbau-Komponenten | nach Grep | siehe „Entfernt“ |

### Nicht löschen — Grep-Belege

| Was | Beleg |
|---|---|
| HV-/Portal-Daten | `hv_meldung` in `resolve-vorgang.ts` / `types.ts`; Portal-Utils vorhanden |
| Provisionen | `src/lib/vertraege/provision-projektvertrag.ts` |
| Freigabe | `org_freigabe` / Freigabe-Texte in Anfragen/Verträge |
| Objekte / Einheiten | `src/lib/kunden-objekte.ts`, `src/lib/objektakte/` |
| Tabelle `partner` | `from('partner')` in `partner/actions.ts`, Suche, Stammdaten |
| Bautagebuch-**Daten** | `bautagebuch-actions.ts`, `auftrag_bautagebuch` in `types.ts` |
| Vertrag-PDF / Turnus | `src/lib/vertraege/*`, `ProjektVertrag*` |
| Handwerker-Portal | `buildPartnerDashboardLink` in `portal-utils.ts` |

### Was sich am Ist geändert hat

| Datei | vorher | nachher | Art |
|---|---|---|---|
| `src/components/partner/*` | CRM-Netzwerk-UI | gelöscht | entfernt |
| `load-partner-liste.ts` | Liste für Partner-UI | gelöscht | entfernt |
| `naechste-schritte.ts` | Step „Auftrag anlegen“ | „Angebot annehmen“ | umgebaut |
| `AngebotDetailPageClient.tsx` | Copy „…Auftrag anlegen“ | „Angebot als angenommen markieren“ | umgebaut |
| `entity-detail-tabs.ts` | Labels Vor Ort / Bautagebuch | Alias → Leistungen | umgebaut |
| `AuftragDetailClient.tsx` | Import `AuftragVorOrtPanel` | lokaler Alias-Typ | umgebaut |
| Legacy Auftrag-Tabs/Panels | ungenutzt | gelöscht | entfernt |

### Entfernt (Orphans, Zeilen ≈)

| Datei | ≈LOC | warum |
|---|---|---|
| `PartnerNetzwerkClient.tsx` | 458 | Partner-UI Spec §15 |
| `PartnerDetailClient.tsx` | 400 | Partner-UI |
| `PartnerPanelContent.tsx` | 132 | Partner-UI |
| `PartnerCard.tsx` | 114 | Partner-UI |
| `PartnerMasterDetailShell.tsx` | 36 | Partner-UI |
| `load-partner-liste.ts` | 35 | nur Partner-UI |
| `AuftragZahlungsplanSection.tsx` | 838 | Legacy Zahlung (Phase 7 → 13) |
| `AuftragLeistungenV3Tab.tsx` | — | ungenutzter Legacy-Tab |
| `AuftragPositionenSteuerungTab.tsx` | — | nur V3-Wrapper |
| `AuftragPositionenMobile.tsx` | — | Legacy |
| `AuftragPositionDetailPanel.tsx` + `PipelineStepper` | — | Legacy Stepper-UI |
| `AuftragBaustelleTab` / `BautagebuchCard` / Modals | — | Tagebuch als CRM-Tab |
| `AuftragPhasenSteps` / `DokumentationPanel` / `PositionenTab` | — | Orphans |
| `AuftragAbschlussSection` / `RechnungenSection` / `PartnerAbgelehntBanner` | — | Orphans |
| weitere `leistungen-v3/*` nur vom gelöschten Tab genutzt | — | Orphans |

### Bewusst nicht geändert
- `partner/actions.ts`, Redirect-Pages `/partner` → `/handwerker`
- `duplicatePartner` Server-Action (Daten/Tabelle)
- `lib/partner/*` Notify/HW-Einreichung (Portal)
- PosBoard (nicht die Löschliste-„Board-Ansicht“ der Vorgänge-Liste)
- Filter-Chip „Wartung & Pflege“ (Bestand-Filter, keine Verlaufs-Phase)

### Verbleibende Orphans (heuristisch, `src/components/auftraege`, nur Selbst-Ref)

| Datei | ≈LOC |
|---|---|
| `AuftragNachtragBaustoppSection.tsx` | 637 |
| `AuftragBautagesberichtCard.tsx` | 539 |
| `AuftragPositionenGewerkView.tsx` | 472 |
| `AuftragPositionHandwerkerPanel.tsx` | 431 |
| `AuftragHandwerkerPanel.tsx` | 413 |
| `BaustelleWochenberichteCard.tsx` | 273 |
| `HandwerkerBewertungModal.tsx` | 237 |
| `HandwerkerKontaktModal.tsx` / `HandwerkerAuswahlModal.tsx` | 217 |
| `MailUebersicht.tsx` | 202 |
| `BaustelleTeamCard.tsx` | 198 |
| `BaustelleRegiearbeitenCard.tsx` | 191 |
| `BautagebuchKundeSendModal.tsx` | 190 |
| `KundeInformierenModal.tsx` | 173 |
| `BaustelleBerichteDokumenteCard.tsx` | 153 |

Nicht in diesem Commit gelöscht (kein klarer Löschliste-Anker / evtl. dynamisch / Folge-Sweep).

### Bekannte Abweichungen zum Mock
- Deep-Links `?tab=bautagebuch`/`vor-ort` landen weiter auf Leistungen (Alias), kein 404
- Copilot-Dateien `crm-wissen`/`crm-oeffnen` ggf. parallel untracked — Labels dort bereits angeglichen, Commit separat
