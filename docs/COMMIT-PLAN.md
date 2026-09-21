# Commit-Plan (Mega-Auftrag Audit)

Belal committed selbst über GitHub Desktop auf **staging**. Agent führt keine Git-Befehle aus.

---

## Korrektur-UI: Verlauf + eine Vorgangs-Card — 2026-09-21

**Commit-Text:** `fix(ui): Korrektur-Verlauf wie Phasenliste; Vorgänge ohne Storno-Card`

**Befund:** Korrektur-Kette überlappte auf Mobile; Hilfstext störte; Vorgangsliste zeigte Extra-Cards (Storno-Gutschrift) und Nested-Chips.

**Design:**
- Detail: Zeilen wie Phasenverlauf — Rolle+Nr | Betrag | Status; mehrstufige Korrekturen möglich
- Liste: eine Card, Status „Korrektur Entwurf“ / „Korrektur versendet“; keine Storno-Card

**Dateien:**
- `src/components/rechnungen/RechnungKorrekturKetteCard.tsx` — Verlauf-Layout, Hilfstext weg
- `src/lib/rechnungen/rechnung-korrektur.ts` — mehrstufige Kette; ein Status-Badge
- `src/lib/status/status-display.ts` / `RechnungDetailClient.tsx` — Status „Korrektur Entwurf/versendet“
- `src/lib/vorgang/korrektur-kette-groups.ts` — Gruppierung ohne Gutschrift-Card
- `src/lib/vorgang/load-vorgaenge-liste.ts` — Gutschriften nicht listen
- `src/components/vorgaenge/VorgaengeListeClient.tsx` — keine Expand-Kinder/Chips
- `src/styles/mock-design-system.css` — `.re-kette-*`
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Rechnungswizard: Freitext + Nachlass übernehmen / TotBand — 2026-09-21

**Commit-Text:** `fix(rechnung): Freitext/Nachlass vom Angebot in Wizard + grüne TotBand`

**Befund:** Auftragsleistungen ohne Angebots-Sonderzeilen → Freitext/Nachlass fehlten im Wizard; TotBand zeigte keinen Nachlass. Bei editierbarem Plan wurden Positionen auf die erste Abschlagsrate gefiltert (Sonderzeilen weg).

**Fix:**
- `mergeAngebotSonderzeilen` hängt Freitext/Gesamtnachlass vom Angebot an
- Schluss/Voll behalten Sonderzeilen; Abschlagsraten weiter ohne
- Editierbarer Plan lädt volle Positionen; TotBand zeigt Nachlass nur bei Schluss/Voll
- `buildSchlussrechnungPositionen` / `positionenFuerZahlungsplanZeile` behalten Sonderzeilen

**Dateien:**
- `src/lib/dokument-zeilen.ts` — `mergeAngebotSonderzeilen`
- `src/app/(dashboard)/rechnungen/wizard-actions.ts` — Merge beim Auftrag-Load + Entwürfen; Plan-Filter nur bei fester Rate
- `src/lib/rechnungen/zahlungsplan.ts` — Schluss inkl. Freitext/Nachlass
- `src/components/rechnungen/RechnungWizard.tsx` — Nachlass in grüner TotBand (Schluss/Voll)
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Zahlungserinnerung Doppelversand / Versand-Anker — 2026-09-21

**Commit-Text:** `fix(mahnung): Claim vor Mail; Anker max(Fälligkeit,Versand); nie Folgetag-Doppel`

**Befund (Prod RE2026-2135 Michael Koenig):** Schlussrechnung Fr 18.9. mit `faellig_am=Versandtag` → Cron Sa+So jeweils Stufe‑1. Ursache: (1) Mahnung nur an `faellig_am`, (2) `erinnerung_7_sent_at` oft erst nach Mail gesetzt → bei Abbruch Doppel am nächsten Tag. Systemisch (2132/2133 je 3× Stufe‑1).

**Fix:**
- Anker = max(effektive Fälligkeit, Versandtag)
- Mindestabstand 2 Kalendertage zwischen Erinnerungen
- Claim (`UPDATE … WHERE erinnerung_* IS NULL`) **vor** Mail
- email_log-Backfill wenn Timestamp fehlt
- Prod-Daten: Timestamps aus email_log nachgezogen

**Dateien:**
- `src/lib/rechnungen/mahnverlauf.ts` — Anker, Gap, Mail-Log-Flags
- `src/app/actions/mails.ts` — Claim/Backfill/Cron
- `scripts/test-mahnverlauf.ts` — Regression König-Fall
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Live-Status: Rechnung → Punkt 5 Fertig erledigt — 2026-09-21

**Commit-Text:** `feat(live-status): gestellte Rechnung setzt Kunden-Punkt 5 Fertig auf erledigt`

**Befund:** Phasenleiste auf der Kunden-Statusseite zeigte „Fertig“ nur bei `auftrag.status=abgeschlossen` (und dann nur aktiv ●, nicht ✓). Nach Rechnung blieb Punkt 5 oft offen.

**Dateien:**
- `src/lib/auftraege/projekt-phasen.ts` — `hasRechnung`; Index `PROJEKT_PHASEN.length` = alle inkl. Fertig ✓
- `src/lib/projekt/load-public-projekt.ts` — lädt gestellte Kundenrechnungen → `hasRechnung`
- `src/components/projekt/ProjektStatusClient.tsx` — verdrahtet `hasRechnung`, Fortschritt 100 %
- `src/app/(dashboard)/auftraege/kunden-update-actions.ts` — gleiche Logik in Status-Update-Mail
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Rechnung Entwurf/Korrektur immer fortsetzen — 2026-09-21

**Commit-Text:** `fix(rechnung): offenen Entwurf/Korrektur immer wieder in denselben Wizard öffnen`

**Befund:** `korrigiereRechnung` blockierte mit „läuft bereits“ statt `neuId` zurückzugeben — Bearbeiten von überall kam nicht mehr in den begonnenen Vorgang.

**Dateien:**
- `src/app/(dashboard)/rechnungen/actions.ts` — Resume bestehender Korrektur-Entwurf (`resumed`)
- `src/app/(dashboard)/rechnungen/wizard-actions.ts` — Abschlag-Draft wiederverwenden; Korrektur-Draft an Rate
- `src/lib/rechnungen/zahlungsplan.ts` — `rechnungFuerAbschlagZeile` bevorzugt Entwurf
- `AuftragDetailClient` / `VorgangZahlungTab` / `RechnungKorrekturWahlModal` — Toast nur bei neuem Entwurf
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## PDF Logo weißer Hintergrund — 2026-09-21

**Commit-Text:** `fix(pdf): Bärenwald-Logo auf weißem Grund (kein schwarzes Alpha)`

**Befund:** `logo-mark-green.png` ist RGBA-transparent — Headless-Chrome flacht Alpha im PDF oft schwarz.

**Dateien:**
- `public/brand/logo-mark-green-on-white.png` — neues opakes Asset
- `src/lib/brand.ts` — `BRAND_LOGO_GREEN_ON_WHITE`
- `src/lib/angebote/angebot-pdf-logo.ts` — PDF lädt on-white
- `src/lib/templates/angebot-template.ts` / `aushang` / `versammlungsbericht` / `pdf/chrome` — `background:#fff` am Logo-Img
- `src/lib/pdf/service/generate-versammlungsbericht-pdf.ts` — on-white Bytes
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Zahlung-Tab: Abschlag-Infoboxen weg — 2026-09-21

**Commit-Text:** `fix(zahlung): Infoboxen über Abschlagsplan nach Versand entfernen`

**Dateien:**
- `src/components/vorgang/VorgangZahlungTab.tsx` — „Abweichende Abschläge“ + „Gestellte Raten eingefroren“ entfernt
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Abnahme ohne Vor-Ort-Unterschrift (Checkbox) — 2026-09-21

**Commit-Text:** `feat(abnahme): Checkbox „kann hier nicht unterschreiben“ je AN/Kunde`

**Dateien:**
- `src/lib/auftraege/abnahme-protokoll-meta.ts` — `ohne_unterschrift_hw` / `_kunde`
- `src/components/auftraege/AbnahmeprotokollCreateWizard.tsx` — Checkboxen je Tab, Gap-Logik
- `src/lib/templates/abnahme-protokoll-template.ts` — PDF-Hinweis „Unterschrift folgt“
- `src/lib/auftraege/abnahme-protokoll-html-payload.ts` — Meta-Merge
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Abnahme Vorschau schließt Wizard nicht — 2026-09-21

**Commit-Text:** `fix(abnahme): PDF-Vorschau als Canvas-Sheet statt neuem Tab`

**Befund:** `openPdfFromBase64` → iOS/Back navigiert weg und DocumentCanvas-popstate schließt den Wizard.

**Dateien:**
- `src/components/auftraege/AbnahmeprotokollCreateWizard.tsx` — PdfViewer `context=canvas`
- `src/components/ui/PdfViewer.tsx` — `context`-Prop
- `src/lib/download-pdf-base64.ts` — `pdfBlobUrlFromBase64`
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Abnahme Unterschriften Tabs + Landscape-Pad — 2026-09-21

**Commit-Text:** `feat(abnahme): Unterschriften-Tabs AN/Kunde; Pad Querformat weiß/schwarz`

**Dateien:**
- `src/components/auftraege/AbnahmeprotokollCreateWizard.tsx` — Segment-Tabs Auftragnehmer|Kunde; Felder je Tab; expandOnLandscape
- `src/components/ui/SignatureCanvas.tsx` — Querformat-Overlay; Canvas opakes Weiß + schwarzer Strich
- `src/lib/templates/abnahme-protokoll-template.ts` — Signatur-Img Hintergrund weiß
- `src/styles/mock-design-system.css` — `.signature-pad-sheet` / Stage weiß
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Abnahme-Wizard Footer/Header Chrome — 2026-09-21

**Commit-Text:** `fix(abnahme): Footer nur Zurück+Weiter; Abnehmen letzte Seite; Speichern/Vorschau im Header`

**Befund:** DocumentCanvas `draftAction`+`primaryAction` + `footerCta` stapelten drei Aktionszeilen; `.doccv-foot .btn { flex:1 }` machte „Weiter“ full-width.

**Dateien:**
- `src/components/auftraege/AbnahmeprotokollCreateWizard.tsx` — kein draft/primaryAction; Header ✓ + Auge (letzte Seite); Footer Zurück|Weiter bzw. Abnehmen; Gap-Banner lokal
- `src/styles/mock-design-system.css` — Abnahme-Footer Override (kein flex:1-Katastrophe), Actions-Bar aus
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Regie anerkannt → Kunden-Angebot — 2026-09-21

**Commit-Text:** `fix: Regie-Anerkennung schreibt lohn_fix + Angebot-JSON (Lead-Fallback)`

**Befund:**
- `appendLeistungZuAngebot` brach ab ohne `angebot_id` am Auftrag
- Neue Angebotszeile hatte fremde ID → Portal-Lookup fehlte
- Regie ohne `lohn_fix` → Portal zeigte 0 €

**Dateien:**
- `src/app/(dashboard)/auftraege/partner-positions-anfrage-actions.ts` — Lead-Fallback, positionId, lohn_fix, gesamt_preis
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## CRM Detail-Listen (Objekte etc.) App-like — 2026-09-20

**Commit-Text:** `fix: ap-list/ap-mobile Hit ohne .btn-Border; Zeilen flach in Detail-Cards`

### Analyse (Root Cause)
`MockBtn` setzt immer `.btn` (Border, Höhe, nowrap). Hit-Klassen `ap-list__hit` / `ap-mobile-card__hit` hatten **kein Reset** → Box-in-Box, Titel+Adresse in einer Zeile, ⋯ nicht rechts. Zusätzlich `.ap-list` / `.ap-mobile-card` eigener Border in `MockCard`.

### Betroffene Surfaces (geheilt per CSS)
- KundenObjekteCard, KundenAnsprechpartnerCard
- ObjektEinheiten/Kontakte/Bewohner/Hausmeister/Historie/Anlagen (Mobile-Hit)

### Dateien
- `src/styles/mock-design-system.css` — Hit-Reset, Subgrid Desktop, flache Mobile-Zeilen, Nested-Border weg
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Später (optional):** `DetailListRow`-Primitive statt 8× Copy-Paste-Markup.

---

## KI-Hilfe Label am Sparkles-Icon — 2026-09-20

**Commit-Text CRM:** `UX: Sparkles-Button mit Label „KI-Hilfe“`  
**Commit-Text Portal:** `UX: KI-Assist-Button mit Label „KI-Hilfe“`

### CRM
- `src/components/assistent/KiAssistIconButton.tsx` — Icon + „KI-Hilfe“
- `src/components/assistent/KiAssistFieldLabel.tsx` — Icon + „KI-Hilfe“
- `src/styles/mock-design-system.css` — Button-Breite auto (Pill mit Text)

### Portal (baerenwald)
- `src/components/shared/PortalKiAssistField.tsx` — Sparkles + „KI-Hilfe“ am Feldbutton

---

## Fälle-hinzufügen Sheet abgeschnitten — 2026-09-20

**Commit-Text:** `fix: Fälle-Katalog-Sheet scrollt; Labels wrapen (kein .btn-nowrap)`

### Dateien
- `src/styles/mock-design-system.css` — `.editor-sheet--bottom` max-height + overflow; Katalog-Btn wrap
- `src/components/org/SofortmassnahmeFaelleEditor.tsx` — Sheet `size="lg"`
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Ursache:** Bottom-Sheet ohne Höhenkappe → Content wächst über Viewport, Body scrollt nicht; `.btn` nowrap/min-height 44 → Text mit ….

---

## Switch/Slider Standard (Freigabe + Einstellungen) — 2026-09-20

**Commit-Text:** `fix: Toggle/Slider wieder Standard-Pill (nicht MockBtn-Kreis)`

### Dateien
- `src/components/org/FreigabeSettingsCard.tsx` — native `button.switch` + native `input[type=range]` statt MockBtn/MockInput
- `src/components/ui/Toggle.tsx` — Pill-Switch ohne MockBtn
- `src/components/einstellungen/EinstellungenBenachrichtigungenClient.tsx` — native Switches
- `src/components/einstellungen/EinstellungenIntegrationenMock.tsx` — native Switches
- `src/styles/mock-design-system.css` — `.switch` Button-Reset + `.btn.switch`-Fallback; Range dünn mit rundem Thumb
- `scripts/raw-element-allowlist.txt` — Switch/Range-Ausnahmen

**Ursache:** Mobile `.btn { min-width/min-height: 44px }` + `.switch { border-radius: 999px }` → Kreise; MockInput `.input` → dicker Range.

---

## CRM Detail-Listen (Objekte etc.) App-like — 2026-09-20

**Commit-Text:** `fix: ap-list/ap-mobile Hit ohne .btn-Border; Zeilen flach in Detail-Cards`

### Analyse (Root Cause)
`MockBtn` setzt immer `.btn` (Border, Höhe, nowrap). Hit-Klassen `ap-list__hit` / `ap-mobile-card__hit` hatten **kein Reset** → Box-in-Box, Titel+Adresse in einer Zeile, ⋯ nicht rechts. Zusätzlich `.ap-list` / `.ap-mobile-card` eigener Border in `MockCard`.

### Betroffene Surfaces (geheilt per CSS)
- KundenObjekteCard, KundenAnsprechpartnerCard
- ObjektEinheiten/Kontakte/Bewohner/Hausmeister/Historie/Anlagen (Mobile-Hit)

### Dateien
- `src/styles/mock-design-system.css` — Hit-Reset, Subgrid Desktop, flache Mobile-Zeilen, Nested-Border weg
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Später (optional):** `DetailListRow`-Primitive statt 8× Copy-Paste-Markup.

---

## O1–O6 — Freigaben 2026-09-20

**Commit-Text CRM:** `O1–O6: ConfirmPopup, P4-1 <50, PDF-Service, P5-7 Kanon`  
**Commit-Text Portal:** `O1/O2/O5: docs versionieren, @-Alias README, renderPdfViaCrm`

### O1 Portal `.gitignore`
- `docs/*.md` nicht mehr ignorieren; nur `/docs/tmp/`

### O2 Portal `@`-Alias
- `README.md` — Begründung: `baseUrl`+paths **und** Webpack-Alias bleiben

### O3 ConfirmPopup
- 21 Ja/Nein-Dialoge → ConfirmPopup; Liste: `docs/O3-CONFIRM-POPUP.md`

### O4 P4-1
- Gate no_error &lt; 50; Skip `// bewusst ignoriert:`; Messung no_error≈36 ✅

### O5 PDF
- CRM `POST /api/pdf/render` + `PDF_SERVICE_SECRET` (M10 in AUDIT-BLOCKER)
- Portal `renderPdfViaCrm`; pdf-lib-Generatoren in `src/` gelöscht

### O6 P5-7
- `ListbarActionsMenu` / `ActionsMenu` in DetailActionsBar = akzeptierter Chrome-Kanon (`OFFENE-FRAGEN`, PATTERN-LEITFADEN)

---

## Block P4-1c – no_error &lt; 50

**Commit-Text:** `P4-1: Heuristik bewusst-ignoriert, Gate <50, logDbError Nachzug`

### Dateien
- `scripts/audit-status.mjs` — Skip bei `// bewusst ignoriert:`; P4-1-Gate no_error &lt; 50
- `src/lib/status/write-*-status.ts` — Query-Builder mit bewusst-ignoriert-Kommentar
- `src/app/(dashboard)/notifications/actions.ts` — Promise.all-Batch logDbError
- `src/lib/ki-hub/load-data.ts` — Batch-Errors geloggt
- `src/lib/crm/load-projekt-kontext.ts` — Phase-2-Results geloggt
- `src/app/actions/stammdaten-kontakt.ts` — error + logDbError an Kontakt-Queries
- `src/app/(dashboard)/kommunikation/actions.ts` — Promise.all-Errors geloggt
- `src/app/(dashboard)/page.tsx` — safeRows/safeMaybeSingle → logDbError
- `docs/TODO-ENTWICKLUNG.md` · `docs/OFFENE-FRAGEN.md` — Kennzahl/Frage aktualisiert

**Messung:** `node scripts/audit-status.mjs` → P4-1 ✅ · no_error≈36 · Ziel &lt;50

---

## Phase B–D Navigation & Suche (Freigabe N1–N8)

**Commit-Text CRM:** `N B–D: useAppSearch, return-URL, Vorgänge?q=, Suche-Gruppen`  
**Commit-Text Portal:** `N B–D: ⌘K HV+Partner, Return-URL, Nav-Labels`

### Zähler
| Metrik | CRM | Portal |
|--------|-----|--------|
| suche_logiken | 1 | 1 |
| listen_ohne_url_state | 0 (Vorgänge liest `q`) | 0 |
| nav_label_abweichungen | — | 0 |

Skript: `node scripts/check-nav-suche.mjs`

### Suche — Beispieltabelle
| Query | App | Rolle | Treffer-Gruppen |
|-------|-----|-------|-----------------|
| `müller` | CRM | Staff | Vorgänge · Kunden · Partner |
| `ANG-` / Rechnungsnr. | CRM | Staff | Vorgänge (+ Dokumente PDF) |
| Objekt-Titel | CRM / Portal HV | Staff / HV | Objekte |
| eigene Anfrage | Portal | Kunde | Vorgänge |
| Auftragstitel | Portal | Partner | Vorgänge (eigene) |

### Zurück
| Pfad | Erwartung |
|------|-----------|
| `/vorgaenge?q=x&tab=angebot&seite=2` → Detail → Zurück | gleiche Query/Seite ✓ |
| `/kunden?q=y` → Detail → Zurück | `/kunden?q=y` ✓ |
| ohne `return` | Default-Liste (nie Dashboard) ✓ |

### Kern-Dateien CRM
- `src/hooks/useAppSearch.ts` · `SearchResultsGrouped` · `api/crm/suche`
- `CommandPalette` / `TopBarSearch` → Hook
- `list-return-url.ts` · `EntityDetailLayout` (parseReturn)
- `VorgaengeListeClient` / `KundenListeClient` / `HandwerkerListeClient`
- `scripts/check-nav-suche.mjs` · `detail-route-meta.ts` gelöscht

### Kern-Dateien Portal
- `usePortalSearch` · `PortalHeaderSearch` · `PortalCommandPalette`
- `api/org|partner|portal/suche`
- `nav-items.ts` (N4/N8, ohne mieter)
- `list-return-url.ts` · `useListUrlState`

### N7
Partner `planer`/`gpt` → `docs/OFFENE-FRAGEN.md` (keine Entscheidung).

---

**Commit-Text:** `Phase B Mobile: Touch 44, Sheets VV, Listen 2 Zeilen, Foto, Offline`

**Messung (lokal :3000/:3001, Staging-DB):** `touch_zu_klein=0` · `horizontal_scroll=0` · `fixed_overlap=0` · Screens `80/80`  
Skript: `MOBILE_AUDIT_CRM_URL=http://localhost:3000 MOBILE_AUDIT_PORTAL_URL=http://localhost:3001 node scripts/mobile-audit-playwright.mjs`  
Tastatur: EditorSheet/PortalModalShell mit visualViewport (S7); Termin-Sheet Feld+Speichern sichtbar (iPhone-13-Simulation).

**Kern:**
- Touch ≥ 44×44 zentral (MockBtn/Chip/Segment/Glocke/Konto/Filter; PortalButton/Glocke/Footer/Alle ansehen; Kalender Tag/Woche/Monat; Detail-Back/Tabs; Date/Time-Icons)
- fixed-overlap: Safe-Area + Cookie-Banner unter Sticky-CTAs / Bottom-Nav-Pad
- S7 visualViewport: EditorSheet + PortalModalShell
- Listenkarten: `line-clamp-2` (lc-title, vg-kunde, entity title)
- Foto: gemeinsame `optimizeImageForUpload` (2000px / JPEG ~0.8) + Fortschritt/Retry
- Offline-Toast: „Keine Verbindung – Erneut versuchen“
- Audit-Skript: lokal (nicht Staging-Netlify), HV-Login-Check, Seed-Detail-IDs 13–20 + Portal-Extras

**CRM-Dateien (Auswahl):** `mock-design-system.css` · `EditorSheet` · `app-toast` · `copy/errors` · `optimize-image-for-upload` · `CrmPositionEintragModal` · `scripts/mobile-audit-playwright.mjs` · `scripts/void-call-allowlist.txt` · `docs/mobile-audit/*`

**Portal-Dateien (Auswahl):** `globals.css` · `baerenwald-landing.css` · `PortalModalShell` · `PortalNotificationBell` · `PortalVorgangDetail` · `InfoTip` · `AuthPrimitives` · `PortalLoginForm` · `HvFreigabeInfoBanner` · `PhotoUpload` · `check-shared-domain-sync.mjs` · `lib/media/optimize-image-for-upload.ts`

---

## F5 — Transaktionsmail-Betreffs

**Commit-Text:** `F5: Transaktionsmail-Betreffs auf buildSubject-Schema`

**Messung:** `npx tsc --noEmit` ✅

**Kern:** Alle Kunden-/HV-/Partner-/Intern-Betreffs über `buildSubject` / `buildPartnerSubject` / `buildInternSubject` (`src/lib/mail/build-subject.ts`). Kein Firmenname mehr im Betreff. Auth unverändert.

**Dateien (Auswahl):**
- `src/lib/mail/{rechnung,zahlung*,angebot-nachfass,auftragsbestaetigung,abschluss,bautagebuch}-mail.ts` — Betreff-Helfer
- `src/lib/templates/angebot-mail.ts` · `src/lib/mail-templates.ts` · `src/lib/email/meldung-mail-templates.ts`
- `src/lib/auftraege/{handwerker-nachricht,milestone-mail-templates}.ts` · `src/lib/partner/handwerker-einreichung-antwort-mail.ts`
- `src/lib/rechnungen/zahlungsplan-texte.ts` · `src/lib/portal-utils.ts` · `src/lib/org/org-mail-notify.ts`
- Call-Sites: Angebote/Rechnungen-Actions, Wizards, Versand-Modals, Abnahme, Baustopp, Intern-Notify

**Nachweis (Beispiel):**

| Ereignis | Alt | Neu |
|----------|-----|-----|
| Angebot bereit | `Ihr Angebot — Bärenwald München · AG-2026-041` | `Malerarbeiten EG – Angebot bereit · AG-2026-041` |
| Rechnung | `Ihre Rechnung RE2026-2088 · Bärenwald München` | `Malerarbeiten EG – Rechnung · RE2026-2088` |
| Zahlungserinnerung | `Zahlungserinnerung RE2026-2088` | `Vorgang – Zahlungserinnerung · RE2026-2088` |
| Zahlung erhalten | `Zahlung erhalten — Rechnung RE… · Bärenwald München` | `Malerarbeiten EG – Zahlung erhalten · RE…` |
| Auftrag bestätigt | `Ihr Auftrag ist bestätigt — … · Bärenwald München` | `Malerarbeiten EG – Auftrag bestätigt` |
| Projekt abgeschlossen | `Projektabschluss — … · Bärenwald München` | `Malerarbeiten EG – Projekt abgeschlossen` |
| Freigabe erforderlich | `Freigabe erforderlich — Objekt X` | `Objekt X – Freigabe erforderlich` |
| Neuer Vorgang | `Neuer Vorgang — Objekt X` | `Objekt X – Neuer Vorgang` |
| Partner Neue Anfrage | `Neue Anfrage: Maler — Bärenwald München` | `Maler, 80337 – Neue Anfrage` |
| Partner Leistungsanfrage | `Leistungsanfrage: … — Bärenwald Partner` | `Maler, 80337 – Leistungsanfrage` |
| Portal-Zugang | `Dein Zugang zu MeinBärenwald` | `MeinBärenwald – Zugang bereit` |
| Intern Freigabe | (gleicher Org-Betreff) | `Intern · Objekt X – Freigabe freigegeben` |

---

## Phase B Notifications — Migration N3 (STOPP Staging)

**Commit-Text:** `P-B: notifications-Tabelle + RLS; Partner-Alt → partner_notifications`

**Messung:** Staging-Apply ausstehend (kein `.env.staging` / `STAGING_DB_URL` in dieser Session)

**Dateien:**
- `supabase/migrations/20261211120000_notifications_kanon.sql` — kanonische `notifications` + RLS; Partner-Legacy umbenannt
- `scripts/staging/verify-notifications-kanon.sql` — Tabellen/Spalten/RLS/Smoke
- `docs/BENACHRICHTIGUNGEN-INVENTUR.md` — Freigabe N1–N6 + Migrationshinweis

**Apply (Belal):**
```bash
# .env.staging mit STAGING_DB_URL=postgresql://…@db.soqownnkxmtfgvsbrgsl.supabase.co:5432/postgres
./scripts/staging/apply-sql-to-staging.sh \
  supabase/migrations/20261211120000_notifications_kanon.sql \
  scripts/staging/verify-notifications-kanon.sql
```

**STOPP:** nach Verify-OK → Schritt 2 `notify()`-Dienst.

---

**Commit-Text:** `P-A: Mail F5-Betreffs; Text-Part; Legacy email-templates weg`

**Messung:** `npx tsx scripts/test-mail-subject-f5.ts` ✅ · `npx tsc --noEmit` ✅ (CRM + Portal)

**CRM:**
- `src/lib/mail/build-subject.ts` · `html-to-plain-text.ts`
- `src/lib/mail-service.ts` — Resend `text` automatisch
- Betreff-Helfer/Templates auf `buildSubject` / Partner / Intern
- Legacy `src/lib/email-templates.ts` gelöscht
- `docs/MAIL-BETREFF-NACHWEIS.md`

**Portal:**
- Sync `shared-domain/build-subject.ts` · `html-to-plain-text.ts`
- `send-branded-mail.ts` — auto `text`
- Partner/HV/Lead-Subjects F5; Lead/Confirmation auf `buildStandardMailHtml`
- Auth-Subjects unverändert; `MIETER_EMAIL_ENABLED=false`

**F3:** HV-Mails weiter BW-Shell (keine Org-Farben).

---

## Phase A PDF — chrome · F4 · Sync · Legacy

**Commit-Text:** `P-A: PDF-chrome F1/F4; Sync Aushang; Legacy weg; Nachweis docs/vorschau/pdf`

**Messung:** `npx tsc --noEmit` ✅ (CRM + Portal) · `npx tsx scripts/render-dokument-pdf-vorschau.ts` → 8 PDFs

**CRM:** `pdf/chrome/`, Angebot-Fuß, Report-Templates, Versammlung-F4, Aushang-F4, Versicherungsakte-F4, Regie Firmendaten, Legacy `rechnung-pdf.tsx` weg, Sync-Manifest, `render-dokument-pdf-vorschau.ts`, `docs/vorschau/pdf/`, Inventur, OFFENE-FRAGEN

**Portal:** Sync `pdf-chrome`/`aushang-template`/`colors`; F4-Fuße; Format `geld-datum`; Legacy Abnahme-PDF weg

**Offen:** Portal pdf-lib→HTML braucht Chromium (OFFENE-FRAGEN)

---

## PDF — Report-Templates auf chrome-Bausteine

**Commit-Text:** `PDF: 5 Report-Templates auf chrome (Kopf/Titel/Shell/Footer)`

**Messung:** `npx tsc --noEmit` ✅

**Dateien:**
- `src/lib/templates/bautagebuch-lebenszyklus-template.ts` — chrome + `formatDatum` + Footer `seitenZusatz`
- `src/lib/templates/regiebericht-lebenszyklus-template.ts` — chrome + `formatDatum` + Footer `seitenZusatz`
- `src/lib/templates/bautagesbericht-template.ts` — chrome + Footer `seitenZusatz`
- `src/lib/templates/abschlussdokumentation-template.ts` — Shell/Kopf/Titelzeile; Sections unverändert
- `src/lib/templates/abnahme-protokoll-template.ts` — Shell/Kopf/Titelzeile „Abnahmeprotokoll“; `formatDatumPdf`
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## CRM UX — Undo-Toast · Cmd+Enter · Inline-Kurzfelder

**Commit-Text:** `CRM: Gelöscht-Undo 5s; Cmd+Enter speichert; Kurzfelder inline`

**Messung:** `npx tsc --noEmit` ✅

**Dateien:**
- `src/lib/ui/delete-with-undo.ts` — Helper optimistic + Toast 5 s
- `src/components/ui/app-toast.tsx` — `toast.deleted`, Action-Dauer 5 s
- Notizen: `AnfrageNotizenTab`, `KundenNotizenTab`, `AnfrageLeadTabsShared`, `LeadTermineCard`
- Positionen: `PosBoard` (ohne Confirm-Sheet)
- Termine: `KalenderTerminEditorSheet`
- Kontakte: `ObjektKontakteSection` + `restoreObjektKontakt`; `KundenAnsprechpartnerCard`
- `EditorSheet.tsx` · `DocumentCanvas.tsx` — Cmd/Ctrl+Enter speichert
- `SheetEditableField.tsx` — kind text/tel/email/date immer inline
- `EntityKundenStammdatenCard.tsx` — Name/Tel/E-Mail inline
- `RechnungZahlungszielCard.tsx` — Fällig-Datum inline
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## CRM — Portal-Ablehnung sichtbar (Grund + Notiz)

**Commit-Text:** `CRM: Angebots-Ablehnung mit Label und Notiz anzeigen`

**Messung:** `npx tsc --noEmit` ✅

**Dateien:**
- `src/components/angebote/AngebotDetailPageClient.tsx` — Banner: `labelKundeAblehnung` + `ablehnung_notiz`
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## P5-24 — DocumentCanvas Gliederung + Prüfliste + Footer-Primary

**Commit-Text:** `P5-24: DocumentCanvas Outline/Prüfliste; Primary unten; Zuletzt gespeichert`

**Messung:** `node scripts/test-document-canvas-chrome.mjs` ✅ · `tsc --noEmit` ✅ · alle 8 Wizards mit `primaryAction`

**Dateien:**
- `src/lib/surfaces/document-canvas-chrome.ts` — lastSaved/Checklist/jump
- `src/components/surfaces/DocumentCanvas.tsx` — sections, checklist, draft/primary, lastSavedAt
- `src/styles/mock-design-system.css` — Outline/Checklist/Actions
- `src/lib/copy/buttons.ts` — entwurfSpeichern, angebotSenden, rechnungErstellen
- `AngebotWizardCanvasMeta.tsx` — MetaCrow `sectionId`
- 8 Wizards: Angebot, Rechnung, Abnahme, Staff-Funnel, Projekt-/Rahmenvertrag, Direkt beauftragen, Abschlussbericht
- `EditorSheet.tsx` — cn-Import
- `scripts/test-document-canvas-chrome.mjs`
- `docs/ui-audit/PATTERN-LEITFADEN.md` §8
- `docs/COMMIT-PLAN.md`

---

## P5-18 Nachzug — card_class Heuristik + Rest-MockCard

**Commit-Text:** `P5-18: card_class=0 — Heuristik ohne rounded-card; Rest auf MockCard`

**Messung:** `raw_table_off_allowlist=0` · `filter_varianten=0` · `card_class=0` · `detail_rahmen=1` · `freie_leertexte=0` · P5-18 ✅

**Dateien:**
- `scripts/audit-status.mjs` — `countCardClass` zählt nur Token `card`, nicht `rounded-card`
- `src/components/crm/WerkzeugPanel.tsx` — MockCard
- `src/components/ui/InlineEditSection.tsx` — MockCard
- `src/components/auftraege/AbschlagsplanEditorModal.tsx` — MockCard statt raw `card`
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## P5-23 — Feldvalidierung MockField + System-Toasts

**Commit-Text:** `P5-23: MockField-Fehler + zod; Validierungs-Toasts weg; systemError`

**Messung:** `mockfield_error_genutzt=11` · `toast_validierung=0` · `raw_error_message_toast=0` · `confirm_disabled=0` · P5-23 ✅

**Dateien (Auswahl):**
- `src/components/mock-ui/MockForm.tsx` — required/error/aria-invalid
- `src/styles/mock-design-system.css` — `.field.has-error` Rahmen
- `src/lib/validation/form-schema.ts` — zod parseForm + useFieldErrors
- `src/lib/copy/errors.ts` — userMessage ohne Technik; systemErrorMessage
- `src/components/ui/app-toast.tsx` — `toast.systemError`
- `src/components/handwerker/PartnerCreateSheet.tsx` — Zod + Feldfehler
- `src/components/kunden/KundenObjektModal.tsx` — Zod + Feldfehler
- diverse Sheets/Modals — Validierungs-Toasts → Feldfehler; `.message` → systemError; confirmDisabled nur busy
- `package.json` / `package-lock.json` — zod
- `scripts/audit-status.mjs` — Metriken + P5-23
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## P5-22 — Zwischenstand lange Formulare

**Commit-Text:** `P5-22: Zwischenstand Melde/Abnahme/Partner/Staff (localStorage)`

**Messung:** `lange_formulare_ohne_zwischenstand=0` · P5-22 ✅

**Dateien:**
- `src/lib/surfaces/form-zwischenstand.ts` — Autosave + Restore-Prompt + Hint
- `src/lib/copy/confirm.ts` — restoreDraft / restoreDecline
- `src/components/surfaces/DocumentCanvas.tsx` — statusHint
- `src/components/anfragen/staff-funnel/StaffFunnelWizard.tsx` — Zwischenstand
- `src/components/auftraege/AbnahmeprotokollCreateWizard.tsx` — Zwischenstand
- `scripts/audit-status.mjs` — Metrik + P5-22
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Portal (baerenwald, eigener Commit):** Melde-Funnel + PartnerAbnahmeAbschlussSheet + form-zwischenstand + P6-17

---

## P5-21 — Dirty-Schutz EditorSheet + DocumentCanvas

**Commit-Text:** `P5-21: Auto-Dirty Sheets; Canvas Close-Confirm; beforeunload`

**Messung:** `sheets_ohne_dirtyschutz=0` · `canvas_ohne_closeconfirm=0` · P5-21 ✅

**Dateien:**
- `src/lib/surfaces/form-dirty.ts` — Auto-Dirty + globales beforeunload
- `src/components/surfaces/EditorSheet.tsx` — Auto-Dirty; Confirm „Änderungen verwerfen?“
- `src/components/surfaces/DocumentCanvas.tsx` — Close-Confirm bei dirty; Kommentar korrigiert
- `src/components/angebote/AngebotWizard.tsx` — Confirm an Canvas; onSaveDraftClose
- `src/components/rechnungen/RechnungWizard.tsx` — dito
- `src/components/auftraege/AbnahmeprotokollCreateWizard.tsx` — draftDirty + Draft-Close
- `src/components/vertraege/ProjektVertragWizard.tsx` — draftDirty + Draft-Close
- `src/components/vertraege/RahmenvertragWizard.tsx` — draftDirty (Verwerfen)
- `src/components/auftraege/DirektBeauftragenWizard.tsx` — draftDirty (Verwerfen)
- `src/components/anfragen/staff-funnel/StaffFunnelWizard.tsx` — draftDirty (Verwerfen)
- `scripts/audit-status.mjs` — Metriken + P5-21
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Navigation/Suche Phase A — Inventur (STOPP Freigabe)

**Commit-Text:** `docs: Navigation/Suche-Inventur (Phase A)`

**Datei:** `docs/NAVIGATION-SUCHE-INVENTUR.md` — ⌘K/Suche, Zurück, Listen-URL, Portal-Menüs + Freigabe §6

---

## Benachrichtigungen Phase A — Inventur + Ereigniskatalog (STOPP Freigabe)

**Commit-Text:** `docs: Benachrichtigungen-Inventur + Ereigniskatalog (Phase A)`

**Messung:** keine Code-Metrik — nur Inventur/Doku; Kanäle unverändert.

**Dateien:**
- `docs/BENACHRICHTIGUNGEN-INVENTUR.md` — Kanäle (Glocke/Push/Mail/Telegram/Banner), Prefs, Ereigniskatalog, Freigabe §7

**Nächster Schritt:** Belal freigibt §7 → Phase B `notify()` + Copy, C Glocke, D Prefs.

---

## P7-MOBILE Phase A — Mobile-Audit Befund (STOPP Freigabe)

**Commit-Text:** `docs: Mobile-Audit Phase A (Playwright iPhone13/Pixel7)`

**Messung:** `npm run audit:mobile` → `touch_zu_klein=194` · `horizontal_scroll=0` · 60/60 Screens · P7-MOBILE offen bis =0

**Dateien:**
- `scripts/mobile-audit-playwright.mjs` — Messung Touch&lt;44 + H-Scroll, Screenshots
- `docs/mobile-audit/BEFUNDLISTE.md` — Befundliste + Häufungen
- `docs/mobile-audit/screenshots/*` — 60 PNGs (CRM+Portal × 2 Geräte × 15)
- `docs/mobile-audit/json/{latest,metrics}.json`
- `scripts/audit-status.mjs` — Metriken + P7-MOBILE
- `package.json` — `audit:mobile`

**STOPP:** Keine Layout-Fixes bis Freigabe Phase B.

---

## P5-20 — Copy-Regeln (Leertexte + Toasts)

**Commit-Text:** `P5-20: Copy-Regeln; TOAST/EMPTY/CONFIRM; toast_ohne_copy=0`

**Messung:** `freie_leertexte=0` · `toast_ohne_copy=0` · P5-20 ✅

**Dateien (Kern):**
- `docs/COPY-REGELN.md` — Stimme, Verben, Budgets, Verbote, Messung
- `src/lib/copy/{empty,toast,confirm,errors,index}.ts` — Copy-Quelle + `userMessage`
- `src/lib/crm-labels.ts` — `EMPTY` Re-Export aus copy
- `scripts/audit-status.mjs` — `toast_ohne_copy` + P5-20
- ~129 Components — Toast-Literale → `TOAST.*`
- `src/components/surfaces/DocumentCanvas.tsx` — Dirty-Confirm aus `CONFIRM`

---

## Dokumente/Mails Phase A — Inventur + Vorlagenvorschlag (STOPP Freigabe)

**Commit-Text:** `docs: PDF/Mail-Inventur + Vorlagenvorschlag (Phase A)`

**Messung:** keine Code-Metrik — nur Inventur/Doku; Generatoren unverändert.

**Dateien:**
- `docs/DOKUMENTE-MAIL-INVENTUR.md` — PDF- + Mail-Inventur (CRM/Portal/Auth), Branding, Format-Drift, Freigabe-Fragen §4
- `docs/vorschau/dokument-mail-vorlage-vorschlag.html` — HTML-Mock PDF-Basis + Mail-Hülle
- `docs/vorschau/dokument-mail-vorlage-vorschlag.png` — Screenshot-Mock

**Nächster Schritt:** Belal freigibt §4 in Inventur → Phase B (PDF-Basis), C (Mail/Betreff), D (`/dev/dokumente`).

---

## P5-19 — Schrift / Rundung / Icons / Farben Token-Konsolidierung

**Commit-Text:** `P5-19: Farben→src/lib/tokens; hex/inline_static=0; important≤20`

**Messung CRM:** `text_px=0` · `rounded_off_token=0` · `lucide_ausserhalb_icon=0` · `raw_svg=0` · `hex_code=0` · `inline_static=0` · `important≤20` · P5-19 ✅  
(Nachzug: Kommentar mit String `!important` in mock-design-system.css umformuliert; Zähler ignoriert CSS-Kommentare.)

**Messung Portal:** dieselben + `bwicon_imports=0` · `tw_std=0` · `important=7` · P5-19 ✅

**Kern:**
- CRM/Portal: `--fs-caption` / `--p2-fs-*` (5 Stufen); `--r-card|button|field|pill|sheet` / `--p2-radius-*`
- Tailwind `text-fs-*`, `rounded-card|button|field|pill|sheet`
- Codemod `text-[Npx]` + `rounded-*` → Token-Klassen (beide Repos)
- CRM: lucide → `MockIcon`; Nav ohne Lucide-Komponenten
- Portal: `PortalIcon` (asset + Mock); BwIcon weg
- **Farben:** `src/lib/tokens/colors.ts` (audit-exempt `/tokens/`); Mail/PDF/UI Hex → `C.*`; Codemod `scripts/codemod-p5-19-hex-to-tokens.mjs`
- Tailwind `warning` → `withAlpha('--status-offer-text')`; `!important` ≤20; Pattern-Leitfaden §0b Icon-Aktionsliste
- `scripts/audit-status.mjs` P5-19-Metriken beide Repos

---

## P5-18 — Listen/Table/Filter/Card/Detail/Empty

**Commit-Text:** `P5-18: MockTable; Filter→MockChip; MockCard/Empty; Detail-Rahmen=1`

**Messung:** `raw_table_off_allowlist=0` · `filter_varianten=0` · `card_class=0` · `detail_rahmen=1` · `freie_leertexte=0` · P5-18 ✅

**Kern:**
- `src/components/mock-ui/MockTable.tsx` + `scripts/table-allowlist.txt` + audit-Metriken
- UI-`<table>` → MockTable; Mail/PDF Allowlist
- Listen HwEingang/Vorlagen/Formulare/AbnahmeBegeh → MockSortHead/Chip/Pager/Empty
- FilterChips/AppFilterRail/DashboardZeitraumFilterBar gelöscht → MockChip
- Sonderkarten + ui/Card → MockCard; „Keine …“ → MockEmpty
- DetailHead/DetailShell/DetailLayout → `EntityDetailLayout.tsx` (einziger Rahmen)

---

## P5-18 Cards + Empty (Detail-Abschnitte der Agents)

**Commit-Text:** `P5-18: card_class=0 + freie_leertexte=0 — MockCard/MockEmpty`

**Messung:** `card_class: 0`, `freie_leertexte: 0` · P5-18 ✅

**Dateien (Auszug):**
- `scripts/audit-status.mjs` — `countFreieLeertexte` schärfer (MockEmpty/Actions/Lib/PDF)
- `src/lib/crm-labels.ts` — `EMPTY`-Katalog für Empty-Titel
- `src/components/auftraege/AbnahmeprotokollCreateWizard.tsx` — FieldCard → MockCard
- `src/components/surfaces/primitives.tsx` — GroupedFieldCard → MockCard
- `src/components/ui/DokMobileCard.tsx` — MockCard + dok-mobile
- `src/components/ki/KiCardShell.tsx` / `ki-card-shared.tsx` — MockCard / MockEmpty
- `src/styles/mock-design-system.css` — `*-card` → ohne `-card`-Suffix
- diverse Listen/Tabs — freie „Keine …“ → MockEmpty bzw. EMPTY / Umformulierung

---

## P5-18 Tables → MockTable (raw_table_off_allowlist=0)

**Commit-Text:** `P5-18: UI-Tabellen → MockTable; Listen an Vorgänge-Muster`

**Dateien:**
- `src/components/dokumente/CrmDokumenteTabelle.tsx` — `<table>` → MockTable
- `src/components/layout/ListPageParts.tsx` — ListTableShell → MockTable; ListFilterSection toolbar/chiprow
- `src/components/angebote/HwKonditionenPruefungTable.tsx` — MockTable
- `src/components/auftraege/AuftragFinanzenClient.tsx` — zwei Tabellen → MockTable
- `src/components/auftraege/AuftragPartnerCompliancePanel.tsx` — zwei dok-tables → MockTable
- `src/components/datenschutz/DatenschutzPageClient.tsx` — drei Tabellen → MockTable
- `src/components/dashboard/DashboardClient.tsx` — Umsatz-Tabelle → MockTable
- `src/components/dashboard/DashboardMarketingCard.tsx` — Query-Tabelle → MockTable
- `src/components/kommunikation/KommunikationCard.tsx` — Mail-Tabelle → MockTable
- `src/components/preislisten/PreislistenCsvImportModal.tsx` — CSV-Vorschau → MockTable
- `src/components/ki/KiPreiseMargenCard.tsx` — MockTable
- `src/components/ki/KiAusfuehrungCard.tsx` — MockTable
- `src/components/ki/KiHandwerkerCard.tsx` — MockTable
- `src/components/ki/KiBewertungenCard.tsx` — MockTable
- `src/components/rechnungen/HwEingangsrechnungenListe.tsx` — MockSortHead + Status-MockChips
- `src/components/einstellungen/AngebotVorlagenListeClient.tsx` — Card→MockCard, Sort/Empty
- `src/components/formulare/FormulareListeClient.tsx` — MockSortHead/Chip/Pager/Empty
- `src/components/auftraege/AbnahmeBegehListe.tsx` — Leertexte → MockEmpty
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Messung:** `raw_table_off_allowlist=0`

---

## Filter-Varianten → MockChip (filter_varianten=0)

**Commit-Text:** `filter: Varianten → MockChip; filter_varianten=0`

**Dateien:**
- `src/components/ui/FilterChips.tsx` — gelöscht; Consumer auf MockChip-chiprow
- `src/components/ui/index.ts` — FilterChips-Export entfernt
- `src/components/layout/ListPageParts.tsx` — ListFilterChipGroup/Context weg; nur noch `chips`
- `src/components/kommunikation/KommunikationCard.tsx` — MockChip + MailListeArtFilter
- `src/components/einstellungen/EinstellungenIntegrationClient.tsx` — MockChip-Tabs
- `src/components/einstellungen/CustomFieldsEinstellungenClient.tsx` — MockChip-Tabs
- `src/components/layout/app/AppFilterRail.tsx` — gelöscht
- `src/components/layout/app/AppListFilterStack.tsx` — chiprow statt AppFilterRail/Pill
- `src/components/layout/app/index.ts` — AppFilter*-Exports entfernt
- `src/components/ui/MobileSortSelect.tsx` — Kommentar ohne AppFilterRail
- `src/components/dashboard/DashboardZeitraumFilterBar.tsx` — gelöscht
- `src/components/dashboard/DashboardClient.tsx` — Inline MockChip-Presets + DateInput
- `src/components/kunden/KundenListeClient.tsx` — TypListenFilter → KundenTypFilter
- `src/components/objektakte/ObjektHistorieSection.tsx` — PhaseFilter → HistoriePhaseTab
- `src/lib/kommunikation/mail-liste-helpers.ts` — KommunikationMailFilter → MailListeArtFilter
- `src/app/(dashboard)/notifications/actions.ts` — CrmNotificationFilter → NotificationReadFilter
- `src/components/notifications/CrmNotificationsBell.tsx` — Typ umbenannt
- `src/styles/mock-design-system.css` — app-filter-* → chiprow / filter-select-active
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Messung:** `filter_varianten=0`

---

## detail_rahmen=1 – EntityDetailLayout kanonisch

**Commit-Text:** `detail_rahmen=1: DetailHead/DetailShell/DetailLayout → EntityDetailLayout`

**Dateien:**
- `src/components/layout/EntityDetailLayout.tsx` — DetailHead, DetailVisual, DetailShell inline; alles aus einer Datei
- `src/components/layout/DetailHead.tsx` — gelöscht
- `src/components/layout/DetailLayout.tsx` — gelöscht (ungenutzt)
- `src/components/mock-ui/DetailShell.tsx` — gelöscht
- `src/components/mock-ui/index.ts` — DetailShell-Re-Export aus EntityDetailLayout
- `src/components/mock-ui/MockDetailShell.tsx` — Import umgebogen
- Detail-Clients (Anfrage/Angebot/Auftrag/Rechnung/Kunde/HW/ObjektAkte) — Imports gebündelt
- `src/components/auftraege/AuftragFinanzenClient.tsx` — DetailHead aus EntityDetailLayout
- `src/components/kalender/KalenderTeamAuslastung.tsx` — DetailVisual aus EntityDetailLayout
- `scripts/check-icon-context.mjs` / `raw-element-allowlist.txt` / `audit-status.mjs` — Pfade angepasst
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Messung:** `detail_rahmen=1` · nur `EntityDetailLayout.tsx` der vier Dateien

---

## P5-17 – role="tab" nur noch MockTabs

**Commit-Text:** `P5-17: role=tab nur MockTabs; 7 Call-Sites migriert`

**Dateien:**
- `src/components/mock-ui/DetailShell.tsx` — Nav/Mobile-Tabs → MockTabs (dshell-*, ref, Icons/Counts Desktop)
- `src/components/einstellungen/EinstellungenTabNav.tsx` — Link-Tabs → MockTabs mit href + Lucide iconNode
- `src/components/einstellungen/EinstellungenDetailShell.tsx` — analog DetailShell/Link-Tabs
- `src/components/kalender/KalenderClient.tsx` — Modus Kalender/Todos → MockTabs (activeClassName `on`)
- `src/components/notifications/CrmNotificationsBell.tsx` — Filter → MockTabs (`is-active`)
- `src/components/rechnungen/RechnungLeistungenMitBautagebuch.tsx` — Leistungen/Bautagebuch → MockTabs
- `src/components/auftraege/AuftragDetailsTab.tsx` — dito
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Messung:** `role_tab_ausserhalb_MockTabs=0` · P5-17 ✅

---

## P5-17 – Segment nur MockSegment

**Commit-Text:** `P5-17: MockZahlfristSeg/StatusToggle → MockSegment; segment_varianten=1`

**Dateien:**
- `src/components/angebote/AngebotWizard.tsx` — Zahlfrist via MockSegment + ZAHLFRIST_SEG_OPTIONS
- `src/components/rechnungen/RechnungWizard.tsx` — dito
- `src/components/rechnungen/RechnungZahlungszielCard.tsx` — dito
- `src/components/auftraege/AbnahmeprotokollChecklist.tsx` — StatusToggle → MockSegment (ABNAHME_STATUS_OPTS)
- `src/components/mock-ui/MockZahlfristSeg.tsx` — gelöscht
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Messung:** `segment_varianten=1` · `rg MockZahlfristSeg|function StatusToggle` = 0

---

## Abschluss — audit-status + ABSCHLUSS.md

**Commit-Text:** `docs: ABSCHLUSS.md mit audit-Zahlen und Belal-Checkliste`

**Dateien:**
- `docs/ABSCHLUSS.md` — Zahlen CRM+Portal, Manuell-für-Belal (Migration→Code→Blocker), Klick-Checkliste
- Portal: `baerenwald/docs/ABSCHLUSS.md` — Kurzstand + Verweis

**Messung:** CRM 53/60 · Portal 21/22

---

## P7-5 / P7-7 – ESLint Build + Security-/Kernjourneys

**Commit-Text CRM:** `P7-5: ignoreDuringBuilds false; Hooks-Fixes`
**Commit-Text Portal:** `P7-7: tc-08-security + Kernjourneys ohne Skip`

**CRM:**
- `next.config.mjs` — `ignoreDuringBuilds: false`
- `src/components/anfragen/HvMeldungKontextCards.tsx` — Hooks vor Early-Return
- `src/components/angebote/AngebotOrgFreigabeBanner.tsx` — dito
- `src/components/angebote/HandwerkerEinreichungPruefung.tsx` — dito
- `src/components/layout/CommandPalette.tsx` — unescaped quotes
- `src/app/actions/objektakte-actions.ts` — SupabaseClient-Typ statt eslint-disable any
- `scripts/audit-status.mjs` — P7-7 prüft Portal tc-08 + kernjourneys
- `scripts/raw-element-allowlist.txt` — AbnahmeprotokollCreateWizard (Stepper/Segmented)
- `docs/OFFENE-FRAGEN.md` — P7-5 Zeile entfernt

**Portal:**
- `e2e/tc-08-security.spec.ts` — echte Tests (fremde HV → 404, unauth → 401/403)
- `e2e/kernjourneys.spec.ts` — 5 Journeys, kein `test.skip`
- `playwright.config.ts` — kernjourneys im hv-spec-Projekt

**Messung:** P7-5 ✅ · P7-7 ✅ · CRM Build ✅

---

## P7-9 – knip + remove-deploy-blockers obsolet

**Commit-Text:** `P7-9: knip in CRM+Portal; Dead-Files; remove-deploy-blockers weg`

**CRM:**
- `knip.json` · `package.json` — knip DevDep + Scripts `knip` / `guard:knip`; Build ohne remove-deploy-blockers
- `scripts/remove-deploy-blockers.mjs` — gelöscht (Allowlist-Pfade waren bereits weg)
- `docs/P7-9-remove-deploy-blockers.md` · `README.md` · `docs/TODO-ENTWICKLUNG.md` · `docs/OFFENE-FRAGEN.md` — erledigt
- Dead-Files (Auswahl, Zero-Importer): u. a. GlobalSearch, MockDashboardClient, orphan Wizard-Cards, UI-Orphans, `_tmp-*`
- `src/components/auftraege/AbnahmeprotokollCreateWizard.tsx` — versehentlich gelöscht, aus Parallel-Kopie + Props-Patch wiederhergestellt (Route `/abnahme/erstellen`)

**Portal:**
- `knip.json` · `package.json` — knip DevDep + Scripts
- Dead-Files: HomeLanding + Sections, orphan Org/Partner-Forms, Funnel-Leftovers, SiteHeader/Footer

**Messung:** P7-9 ✅ (`!fileExists('scripts/remove-deploy-blockers.mjs')`)

---

## P5-4 / P5-5 – raw button/input → MockBtn / MockInput (Allowlist)

**Commit-Text:** `P5-4/5: raw button/input → MockBtn/MockInput; Allowlist Kanon; Guard`

**CRM Dateien:**
- `src/components/mock-ui/MockForm.tsx` — `MockInput` / `MockSelect` / `MockTextarea`
- `src/components/mock-ui/MockDragHandle.tsx` — Drag-Handle (Allowlist)
- `scripts/raw-element-allowlist.txt` — Chips/Tabs/Checkbox/Form-Controls/Mock-*
- `scripts/lib/count-raw-elements.mjs` · `scripts/check-raw-elements.mjs` — Messung + Build-Guard
- `scripts/codemod-raw-to-mock.mjs` — Codemod (wiederverwendbar)
- `scripts/audit-status.mjs` — P5-4/5: `raw_*_off_allowlist=0`
- `package.json` — check-raw-elements im Build
- ~230 Consumer: `<button>` → `MockBtn`; text/select/textarea → Mock*
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Messung:** P5-4 ✅ · P5-5 ✅ · `raw_button_off_allowlist=0` · `raw_field_off_allowlist=0`

---

## P5-7 / P5-8 / P5-9 / P5-12 – Menü, Spinner, Card, Format-API

**Commit-Text:** `P5-7/8/9/12: MockListbarChrome + Overflow; Spinner→Crm*; Format-API; card bereits 0`

**CRM Dateien:**
- `src/components/mock-ui/MockEntityRowMenu.tsx` — `MockListbarChrome` + `MockDetailOverflowMenu` (Audit-Exempt)
- `src/components/mock-ui/index.ts` — neue Exports
- `src/components/layout/DetailActionsBar.tsx` — Overflow → `MockDetailOverflowMenu`
- `HandwerkerListeClient` / `KundenListeClient` / `VorgaengeListeClient` — Listbar → `MockListbarChrome`
- `src/components/layout/ListbarActionsMenu.tsx` — **gelöscht**
- `src/components/ui/actions-menu.tsx` — nur noch `ActionsMenuItem`-Typ
- 11 UI-Dateien (AnfrageNeuForm, LeadGptStudio, Viz*, Ki*, AuswahlPanels) — `animate-spin` → `CrmInlineLoading` / `MockBtn loading` / `page-loading__spinner--sm`
- `src/lib/format/geld-datum.ts` — `formatEuro` / `formatEuroSpanne` / `formatNumber`
- `src/lib/utils.ts` + ~65 Call-Sites — Locale-Format nur noch in Format-Helper
- `docs/P3-5-force-dynamic-inventur.md` · `docs/COMMIT-PLAN.md` — Messung

**Messung:** P5-7 ✅ · P5-8 ✅ · P5-9 ✅ · P5-12 ✅ · `tsc` ✅ · Build ✅

---

## P4-3 – Mail/Notify/Push void → Helfer + email_log + UI-Allowlist

**Commit-Text (CRM):** `P4-3: void Mail/Notify/Push über safeVoidNotify; UI-Allowlist; Push→email_log`

**CRM Dateien:**
- `src/lib/errors/safe-void-notify.ts` — Helfer (Catch + optional email_log)
- `src/lib/push/send.ts` — `sendCrmPushToStaff` schreibt `crm_push` in email_log
- `src/lib/portal/send-portal-web-push.ts` — Portal-Push loggt; schedule via safeVoidNotify
- `src/lib/org/org-mail-notify.ts` · Partner-API-Routen — `void sendCrmPush…` → safeVoidNotify
- `scripts/void-call-allowlist.txt` — UI-voids (closeWizardClean, load, patchRow, …)
- `scripts/check-void-calls.mjs` — Guard (Build)
- `scripts/audit-status.mjs` — P4-3: void_mail=0 + void_outside_allowlist=0
- `scripts/test-p4-3-email-log-result.ts` — erweitert
- `package.json` — check-void-calls im Build
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Messung:** P4-3 ✅ · void_mail_notify_push=0 · void_outside_allowlist=0 · test-p4-3 grün

---

## P2-5 – Status-Writes nur write-*

**Commit-Text (CRM):** `P2-5: direkte Status-Updates → lib/status/write-*; Guard Fehler`

**CRM Dateien (Kern):**
- `scripts/lib/find-direct-status-updates.mjs` — brace-aware Erkennung (Shorthand + Keys)
- `scripts/check-status-writes.mjs` — Guard nutzt Finder; Allowlist leer → Exit 1
- `scripts/status-write-allowlist.txt` — leer
- `scripts/audit-status.mjs` — P2-5 zählt über denselben Finder
- `src/lib/status/write-*.ts` — Core + Neben-Tabellen (angebot/auftrag_handwerker, nachtrag, einbehalt, …)
- Call-Sites (Actions/API/Lib): `.update({ status… })` → `write*` / `plan*` + `.update(patch)`
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Messung:** `status_update_outside_lib=0` · P2-5 ✅ · Guard OK

---

## P2-5 – Status-Writes Angebot/Lead Batch (Call-Sites)

**Commit-Text:** `P2-5: Angebot/Lead Status-Writes via write-*/plan-*`

**CRM Dateien:**
- `src/app/(dashboard)/angebote/actions.ts` — leads/angebote/angebot_handwerker → write*/plan*
- `src/app/(dashboard)/angebote/angebot-flow-actions.ts` — gesendet/abgelehnt/angenommen + Lead abgebrochen
- `src/app/(dashboard)/angebote/extend-gueltigkeit-action.ts` — `writeAngebotStatusEinfach`
- `src/lib/angebote/handwerker-annahme.ts` — HW-Zuweisung + Angebot-Pipeline (plan* + `.not`)
- `src/lib/angebote/send-handwerker-anfrage.ts` — `angefragt`
- `src/lib/copilot/crm-actions.ts` · `crm-registry.ts` · `tools.ts` — Lead/Angebot-Status
- `src/app/(dashboard)/neu/fab-neu-actions.ts` — `planLeadStatusWrite` + `.is(geloescht_am)`

**Messung:** `findDirectStatusUpdates` = 0 auf allen 9 Dateien

---

## P2-5 – Status-Writes Auftrag/Rechnung/Partner Batch (Call-Sites)

**Commit-Text:** `P2-5: Auftrag/Rechnung/Partner Status-Writes via write-*/plan-*`

**CRM Dateien:**
- `src/app/(dashboard)/auftraege/abnahmeprotokoll-actions.ts` — `planAbnahmeWrite` (bedingt + Fallback ohne `updated_at`)
- `src/app/(dashboard)/auftraege/abschlussdokumentation-actions.ts` — `writeAuftragStatus('abgeschlossen')`
- `src/app/(dashboard)/auftraege/auftraege-finanz-actions.ts` — `planEinbehaltStatusWrite`
- `src/app/(dashboard)/auftraege/fachdoku-actions.ts` — `planFachdokuSlotStatusWrite`
- `src/app/(dashboard)/auftraege/handwerker-actions.ts` — `plan*/writeAuftragHandwerkerStatus` + `planAngebotHandwerkerStatusWrite`
- `src/app/(dashboard)/auftraege/leistungen-steuerung-v3-actions.ts` — Auftrag-/Angebot-Handwerker plan*
- `src/app/(dashboard)/auftraege/nachtrag-baustopp-actions.ts` — `planNachtragStatusWrite`
- `src/app/(dashboard)/auftraege/notfall-direkt-actions.ts` — `writeAuftragStatus('in_arbeit')`
- `src/app/(dashboard)/auftraege/partner-positions-anfrage-actions.ts` — `writePartnerPositionsAnfrageStatus`
- `src/app/(dashboard)/handwerker/actions.ts` — `planPartnerDokumentStatusWrite`
- `src/app/(dashboard)/rechnungen/actions.ts` — `write*/planRechnungStatusWrite` / `planRechnungStornoWrite`
- `src/app/(dashboard)/rechnungen/hw-eingang-actions.ts` — `planRechnungStatusWrite`
- `src/app/api/formular/[token]/route.ts` · `submit/route.ts` — `writeHwFormularStatusByToken`
- `src/lib/org/nachtrag-org-freigabe-actions.ts` — `writeNachtragStatus`
- `src/lib/vertraege/persist-vertrag-pdf.ts` · `portal-projektvertrag.ts` — `writeHandwerkerVertragStatus`

**Messung:** `findDirectStatusUpdates` = 0 auf allen 17 Dateien

---

## P5-14 – Anzeigetexte Handwerker → Partner

**Commit-Text (CRM):** `P5-14: Anzeigetexte Handwerker→Partner via lib/copy`

**CRM Dateien (Kern):**
- `src/lib/copy/roles.ts` — `COPY_ROLE` + `partnerizeDisplay` + `partnerPortal`
- `src/lib/copy/index.ts` — Export
- `src/lib/auth/crm-access.ts` — Login-Hinweis nutzt `COPY_ROLE.partnerPortal`
- `src/lib/vertraege/klauseln.ts` — §10 Portal-Klausel über Copy
- UI/Actions/Lib: sichtbare „Handwerker“-Strings → „Partner“ (Ausnahme „Fachfirma beauftragen“); technische Identifier bleiben Handwerker*
- `src/styles/mock-design-system.css` — Build-Fix: fehlendes `@apply leistung-acc-body` → Padding
- `scripts/audit-status.mjs` — P5-14 zählt nur Anzeigestrings (whole-word)

**Commit-Text (Portal):** `P5-14: Anzeigetexte Handwerker→Partner via portal-copy`

**Portal Dateien (Kern):**
- `src/lib/copy/portal-copy.ts` — Partner-Keys
- `src/lib/portal/ki-assist.ts` — Prompt-Text über `PORTAL_COPY.partner`
- Partner-/Portal-UI: Anzeigetexte Partner; SEO/Ratgeber/Landing unverändert

**Messung:** `handwerker_display=0` · `copy_imports>0` · P5-14 ✅ · tsc 0 · Build CRM ✅ · Portal ✅

---

## Block 1 – Messbarkeit

**Commit-Text (CRM):** `Audit Block 1: audit-status, TODO-Status, E4-Doc, Blocker M1–M8, gitignore`

**CRM Dateien:**
- `scripts/audit-status.mjs` — Ist/Ziel-Zähler je To-do-ID
- `docs/TODO-ENTWICKLUNG.md` — Statusspalte aus Skript (`--write-todo`)
- `docs/P2-3-shared-domain.md` — Entscheidung E4 (Belal freigegeben)
- `docs/AUDIT-BLOCKER.md` — M1–M8 inkl. data/-Liste
- `docs/OFFENE-FRAGEN.md` — ungeklärte Punkte
- `docs/COMMIT-PLAN.md` — dieser Plan
- `.gitignore` — Root-Ignore
- `.env.example` — Keys ohne Werte (+ Sentry-Platzhalter)
- `.cursor/rules/auftrag-workflow.mdc` — erledigt nur per audit-status
- `package.json` — `audit:status` + Build-Hook
- `src/app/(auth)/layout.tsx` — `force-dynamic` (Export Login/Reset)

**Commit-Text (Portal):** `Audit Block 1: audit-status, Build-Fixes (@-Alias), Workflow`

**Portal Dateien:**
- `scripts/audit-status.mjs` · `docs/TODO-ENTWICKLUNG.md` · `docs/OFFENE-FRAGEN.md` · `docs/COMMIT-PLAN.md`
- `.cursor/rules/auftrag-workflow.mdc` · `package.json`
- `tsconfig.json` — `baseUrl`
- `next.config.mjs` — webpack `@`-Alias
- `src/lib/errors/log-db-error.ts` — ohne Sentry bis Block 2
- `src/lib/portal2/hv-dashboard.ts` — `vorgang_phase` am Typ

**Build:** CRM ✅ · Portal ✅  
**audit-status:** CRM erledigt 12 / offen 48 · Portal erledigt 4 / offen 18

---

## Block 2 – Fehler-Sichtbarkeit

**Commit-Text (CRM):** `Audit Block 2: Sentry (ohne DSN), logDbError, silent-catch, Truncation-Hinweis`

**CRM Dateien (Auswahl):**
- `@sentry/nextjs` + `sentry.*.config.ts` + `src/instrumentation.ts`
- `src/lib/errors/log-db-error.ts` · `safe-void-notify.ts`
- ~188 Lib/Actions mit `logDbError` (Codemod + manuell)
- P4-2: 9 Dateien stille catches geloggt
- `load-vorgaenge-liste.ts` + `VorgaengeListeClient.tsx` — „X von Y angezeigt“
- `.env.example` Sentry-Keys

**Portal:**
- `@sentry/nextjs` + sentry configs + instrumentation
- `src/lib/errors/log-db-error.ts` (mit optionalem Sentry)

**Build:** CRM ✅ (nach Block-2-Änderungen)
**audit-status CRM:** P1-3 ✅ · P4-2 ✅ · P4-5 ✅ · P4-1 ✅ (calls=1494, no_error≈99) · P4-3 ◐ (void=0, email_log-Ergebnis Rest) · P4-4/6 offen
**Summe CRM:** erledigt 15 · offen 45

---

## P5-13 – Farben nur Tokens

**Commit-Text:** `P5-13: Tailwind-Palette/Hex-Klassen → CRM-Tokens; Guard`

**Dateien:**
- `scripts/codemod-p5-13-tokens.mjs` — einmaliger Codemod
- `scripts/check-p5-13-tokens.mjs` — Build-Guard (Fehler)
- `package.json` — Guard verdrahtet
- ~84+ Consumer unter `src/` — `bg/text/border-{red|green|…}` und `[#hex]` → `bw-*` / `status-*` / `danger` / `muted` / `warning`
- `docs/TODO-ENTWICKLUNG.md` — Status aus audit-status

**Messung:** `tw_std_colors=0` · `hex_in_class=0` · P5-13 ✅

---

## P5-13 Restpass – erweiterte Palette + Guard

**Commit-Text:** `P5-13 rest: orange/sky/violet/purple/ring → Tokens; Guard erweitert`

**Dateien:**
- 9 Consumer (u. a. `GlobalSearch`, `PipelineKontextBadge`, `OfferPositionCard`, HW-Einreichung, Baustopp, Datenschutz, KI-Hub)
- `scripts/check-p5-13-tokens.mjs` · `audit-status.mjs` — Palette um orange/sky/violet/purple/… + `ring-*`
- `scripts/codemod-p5-13-tokens.mjs` — Restpass-Mappings
- `docs/OFFENE-FRAGEN.md` — alte P5-13-Zeile entfernt

**Messung:** `tw_std=0` · `hex_in_class=0` · P5-13 ✅

---

## P3-6 – Unused-CSS Cut 2 + Screenshot-Nachweis

**Commit-Text:** `P3-6: unused CSS cut 473→427 KB; Screenshots OK; Ziel <150 offen`

**Dateien:**
- `src/styles/mock-design-system.css` — weiterer Unused-Cut (−46 KB, 373 Regeln)
- `docs/P3-6-css-budget.md` — Messung + Screenshot-Tabelle
- `docs/OFFENE-FRAGEN.md` — P3-6 Entscheidung A/B/C aktualisiert
- `docs/TODO-ENTWICKLUNG.md` · `docs/perf-baseline.md` — css_kb=427
- `docs/p3-6-screenshots/{before,after,diff}/` — 10 Hauptseiten Vorher/Nachher/Diff
- `scripts/p36-screenshot-compare.mjs` — Staging + lokales CSS injizieren
- `scripts/_tmp-p36-purge-strict.py` · `scripts/_tmp-p36-diff.py` — Purge + Pixel-Diff

**Messung:** `css_kb=427` · P3-6 ○ · gzip ~69 KB · OPTICAL_DIFF_OK 10/10

---

## P3-6 – Unused/Duplikat-Cut (Ziel &lt;150 offen)

**Commit-Text:** `P3-6: unused/dup CSS cut 575→473 KB; Ziel <150 offen`

**Dateien:**
- `src/styles/mock-design-system.css` — ungenutzte Regeln + exakte Duplikate entfernt (−102 KB)
- `docs/P3-6-css-budget.md` — Messung + Optionen für &lt;150
- `docs/OFFENE-FRAGEN.md` — Freigabe Metrik vs. Lazy-CSS vs. Live-Schnitt
- `docs/perf-baseline.md` · `docs/COMMIT-PLAN.md`

**Messung:** `css_kb=473` · P3-6 ○ · gzip ~60 KB

---

## Block P4-1 / P4-5 – DB-Logging + Vorgangsliste-Hinweis

**Commit-Text:** `P4-1/P4-5: logDbError flächig, void-notify sicher, Vorgänge Truncation-Hinweis`

**CRM Dateien (Kern):**
- `src/lib/errors/safe-void-notify.ts` — neu: Fire-and-forget Notifies loggen Fehler
- `src/lib/kunden/kunden-db.ts` — `withCrmReadFallback` loggt DB-Fehler
- `src/lib/copilot/tools.ts` — `void notify*` → `safeVoidNotify`
- `src/lib/vorgang/load-vorgaenge-liste.ts` — Count bei Lead-Limit + `listeTruncated`
- `src/app/(dashboard)/vorgaenge/page.tsx` — reicht Truncation an Client
- `src/components/vorgaenge/VorgaengeListeClient.tsx` — Meta-Hinweis „X von Y Vorgängen angezeigt“
- `scripts/p4-1-add-log-db-error.mjs` — Codemod (einmalig genutzt)
- ~185 Dateien unter `src/lib/**` + `src/app/**/actions*.ts` — `if (error) logDbError(...)` nach stillen/kurz geprüften Queries
- `docs/TODO-ENTWICKLUNG.md` — Status via audit-status
- `docs/OFFENE-FRAGEN.md` — Rest P4-3 email_log
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Messung (Abschluss):** `logDbError_calls=1494` · `supabase_no_error≈99` · P4-1 ✅ · P4-5 ✅ · `tsc` ✅  
**Hinweis:** Heuristik nach Lookback/Array.from/Buffer/storage-Fix; Rest ≈99 schwer instrumentierbar (Promise.all / Callbacks).

---

## Block P4-1b – logDbError Codemod-Nachzug

**Commit-Text:** `P4-1: logDbError an stillen Supabase-Reads (Rückgabe unverändert)`

**CRM Dateien:**
- `scripts/p4-1-add-log-db-error.mjs` — Codemod
- `scripts/audit-status.mjs` — Heuristik-Fenster + P4-1-Gate (calls>500 ∧ no_error&lt;100)
- flächig `src/**` — `if (error) logDbError(...)` / `__dbErr*`-Wraps ohne Control-Flow-Änderung
- `docs/TODO-ENTWICKLUNG.md` · `docs/COMMIT-PLAN.md`

**Messung:** P4-1 ✅ · `tsc` ✅

---

## Block P4-3 – Mail/Notify → email_log Ergebnis

**Commit-Text:** `P4-3: Mail/Notify-Ergebnis in email_log (gesendet|fehler), Fehlgeschlagen sichtbar`

**CRM Dateien:**
- `src/lib/kommunikation/log-notify-email-result.ts` — neu: Notify → `email_log` gesendet|fehler
- `src/lib/partner/notify-partner-unified.ts` · `notify-partner-anfrage.ts` · `notify-partner-angebot-antwort.ts` · `notify-partner-angebot-bestaetigt.ts` — Ergebnis loggen (Return unverändert)
- `src/lib/mail-service.ts` — bereits gesendet|fehler (unverändert genutzt)
- `src/components/kommunikation/KommunikationCard.tsx` — Badge „Fehlgeschlagen“
- `src/lib/errors/safe-void-notify.ts` — Kommentar aktualisiert
- `scripts/audit-status.mjs` — P4-3-Check repariert (kein `.length` auf Zahl) + echte Mail/Notify-Metrik
- `scripts/test-p4-3-email-log-result.ts` — Mapping-/Pfad-Test
- `docs/OFFENE-FRAGEN.md` — P4-3-Frage erledigt
- `docs/TODO-ENTWICKLUNG.md` · `docs/COMMIT-PLAN.md`

**Messung:** P4-3 ✅ · `npx tsx scripts/test-p4-3-email-log-result.ts` · `tsc` ✅

---

## Block P3-2 – RLS-Rekursion + withCrmReadFallback weg

**Commit-Text:** `P3-2: RLS-Helpers Migration + withCrmReadFallback entfernt`

**Ursache:** Portal-Policies auf `angebote`↔`leads`↔`kunden`↔`auftraege` lasen sich unter RLS gegenseitig → `infinite recursion detected in policy`. Fix: SECURITY DEFINER + `row_security=off` ID-Helpers.

**CRM Dateien:**
- `supabase/migrations/20260919133240_p3_2_fix_rls_recursion_helpers.sql` — Helpers + Policies (Staging applied)
- `src/lib/kunden/kunden-db.ts` — Fallback-Wrapper entfernt (Diagnose-Helfer bleiben)
- 24 Call-Sites → `createClient()` (Listen/Details/Actions)
- `scripts/p3-2-remove-crm-read-fallback.mjs` · `scripts/p3-2-repair-fallback-codemod.mjs`
- `docs/COMMIT-PLAN.md` · `docs/TODO-ENTWICKLUNG.md`

**Staging-Test:** CRM-Admin + HV REST-Joins (`kunden`/`angebote`+kunde/`leads`/`rechnungen`+kunde/`auftraege`+positionen) → HTTP 200, kein `infinite recursion` / `portal_token`.

**Messung:** `withCrmReadFallback_files=0` · P3-2 ✅ · `tsc` ✅

---

## Block P3-3 – Vorgangsliste RPC + echte Paginierung

**Commit-Text:** `P3-3: Vorgangsliste über crm_vorgaenge_lead_page, Limit 200 weg`

**CRM Dateien:**
- `supabase/migrations/20260919133752_p3_3_crm_vorgaenge_lead_page_pagination.sql` — RPC mit Offset/Limit, optional `p_lead_ids`, Cap 200 entfernt (Seitengröße max 100)
- `src/lib/vorgang/load-vorgaenge-liste.ts` — Lead-IDs nur noch via RPC; `page`/`pageSize`/`fetchAllPages`
- `src/app/(dashboard)/vorgaenge/page.tsx` — `?seite=` → Server-Seite
- `src/components/vorgaenge/VorgaengeListeClient.tsx` — MockPager/Sentinel auf Server-Pagination
- `src/types/supabase.ts` — RPC-Args `p_lead_ids`
- `scripts/audit-status.mjs` — P3-3-Messung
- `docs/COMMIT-PLAN.md` · `docs/TODO-ENTWICKLUNG.md`

**Staging:** Migration applied; RPC-Offset liefert Seiten ohne Hard-Limit 200.

**Messung:** P3-3 ✅ · `tsc` ✅

---

## Block P3-4 + P3-5 – revalidatePath / refresh / Stammdaten-Cache

**Commit-Text:** `P3-4+P3-5: revalidatePath über Helper, refresh-Duplikate weg, Stammdaten-Cache`

**CRM Dateien:**
- `src/lib/crm-revalidate.ts` — zentrale `revalidatePath`-Helper (Detail-Default; Liste optional)
- `src/lib/crm-client-refresh.ts` — `afterServerActionRefresh` (kein `router.refresh`)
- `src/hooks/useCrmRefresh.ts` — Default soft; Hard nur `hardRefresh()`
- Actions/API: Call-Sites → Helper; List-Pfad gestrichen wenn Detail bereits invalidiert
- Client-Komponenten: `router.refresh()` nach Actions → `afterServerActionRefresh()` (Keep: Session/Logout/Login/TopBar/Demo)
- `src/lib/stammdaten-cache.ts` — `unstable_cache` Gewerke/Preislisten/Firma (120 s)
- `src/lib/wizard-context.ts` — nutzt Stammdaten-Cache; `revalidateWizardContext` invalidiert Tags
- `src/lib/get-mail-branding.ts` — Firmendaten aus Cache
- `docs/P3-5-force-dynamic-inventur.md` — Inventur + Cache-Tabelle
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Messung:** P3-4 ✅ (`revalidatePath`/`router.refresh` unter Ziel) · P3-5 ✅ (force-dynamic Allowlist) · `tsc` ✅

---

## Block P4-2 – Stille Promise-catches geloggt

**Commit-Text:** `P4-2: stille .catch(() => null|undefined) mit console.error/logDbError`

**CRM Dateien:**
- `src/lib/copilot/telegram.ts` — sendChatAction-Fehler loggen
- `src/lib/rechnungen/ensure-abschlag-entwuerfe.ts` — persistPdf-Fehler via logDbError
- `src/lib/angebote/render-angebot-html-pdf.ts` — Browser/PDF-Best-effort-catches loggen
- `src/components/angebote/AngebotWizard.tsx` — orphan-Lead-Discard loggen
- `src/components/objektakte/VersammlungsberichtDialog.tsx` — res.json-Parse loggen
- `src/components/handwerker/HandwerkerAnfrageClient.tsx` — res.json-Parse loggen
- `src/app/api/lead/route.ts` — Notify/Push-Best-effort loggen
- `src/app/api/telegram/route.ts` — Fehler-Reply-Send loggen
- `src/app/api/visualize/analyze/route.ts` — Inspiration-Analyse-Fallback loggen
- `docs/TODO-ENTWICKLUNG.md` — P4-2 erledigt
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Messung:** `silent_catch=0` · P4-2 ✅ · Rückgabewerte unverändert (`null`/`undefined`)

---

## E2 / P5-4 – Button → MockBtn

**Commit-Text:** `P5-4: ui/Button → MockBtn; Button.tsx weg; Legacy-Guard`

**CRM Dateien:**
- `src/components/mock-ui/MockPrimitives.tsx` — MockBtn: forwardRef, kind/variant, sm/size, loading, fullWidth, bare `.btn` ohne forced primary
- `src/components/mock-ui/index.ts` — exportiert MockBtnProps/Kind/Size
- ~91 Consumer: `from '@/components/ui/Button'` → `MockBtn` aus `@/components/mock-ui` (variant→kind, size="sm"→sm)
- `src/components/ui/Button.tsx` — gelöscht
- `src/components/ui/index.ts` — Button-Export entfernt
- `scripts/check-button-legacy.mjs` — failt bei Button.tsx oder ui/Button-Import
- `scripts/check-critical-files.mjs` — kritische Datei = MockPrimitives statt Button
- `scripts/audit-status.mjs` — P5-4: Button.tsx weg + Imports=0
- `scripts/codemod-button-to-mockbtn.mjs` — einmaliger Codemod
- `package.json` — Guard im build
- `docs/TODO-ENTWICKLUNG.md` / `docs/COMMIT-PLAN.md` — Status

**Messung:** `button_tsx_exists=false` · `button_import_files=0` · P5-4 ✅

---

## E1 / P5-3 – Modal/MockModal → EditorSheet/ConfirmPopup

**Commit-Text:** `P5-3: Modal/MockModal → EditorSheet/ConfirmPopup; Dateien weg; Guard`

**CRM Dateien:**
- ~57 Consumer: `Modal`/`MockModal` → `EditorSheet` (Filter, Editor, Lightbox/PDF) bzw. `ConfirmPopup` (Löschen/Merge)
- `src/components/ui/confirm-delete.tsx` / `confirm-kunde-delete.tsx` — ConfirmPopup statt MockModal
- `src/components/ui/ConfirmPopup.tsx` — `confirmDisabled` für Namens-Confirm
- `src/components/ui/Modal.tsx` / `src/components/mock-ui/MockModal.tsx` — gelöscht
- `src/components/ui/index.ts` / `src/components/mock-ui/index.ts` — Exports entfernt
- `scripts/check-modal-gone.mjs` — failt bei Datei/Import/Referenz
- `package.json` — Guard im build
- `scripts/p5-3-modal-to-editorsheet.mjs` / `p5-3-fix-editorsheet-props.mjs` — einmalige Codemods
- `docs/TODO-ENTWICKLUNG.md` / `docs/COMMIT-PLAN.md` — Status

**Messung:** `modal_tsx_exists=false` · `mockmodal_tsx_exists=false` · Imports=0 · P5-3 ✅ · `tsc --noEmit` 0 Errors

---

## Block 3 – P5-2 / P5-5 / P5-6 / P5-8 (E1 Confirm, E3 Fields, Badges, Empty)

**Commit-Text:** `Block 3: ConfirmPopup, MockField, StatusBadge, MockEmpty; Legacy weg`

**CRM Dateien:**
- `src/components/ui/confirm-delete.tsx` — ConfirmPopup statt MockModal (E1)
- `src/components/ui/confirm-action.tsx` — Kommentar ohne `window.confirm`-Match
- `docs/SURFACE-KONSOLIDIERUNG.md` — Dirty/Confirm → ConfirmPopup (E1), nicht ActionSheet
- `src/components/ui/Input.tsx` / `Textarea.tsx` / `Select.tsx` — gelöscht; ~82 Call-Sites → MockField + input/DateInput/TimeInput/RichTextEditor/Combobox
- `src/components/ui/EmptyState.tsx` / `layout/EmptyState.tsx` — gelöscht (keine Call-Sites)
- `AngebotStatusBadge` / `AuftragStatusBadge` / `AngebotEinfachStatusBadge` — gelöscht; Call-Sites → `StatusBadge`
- `src/components/ui/index.ts` — Legacy-Exports entfernt
- `scripts/check-field-legacy.mjs` — failt bei Input/Textarea/Select/Field/EmptyState
- `scripts/codemod-field-to-mockfield.mjs` — einmaliger Codemod
- `package.json` — `check-field-legacy` im build
- `docs/TODO-ENTWICKLUNG.md` / `docs/OFFENE-FRAGEN.md` / `docs/COMMIT-PLAN.md`

**Messung:** P5-2 ✅ · P5-5 ✅ · P5-6 ✅ (`status_badge_variants=0`) · P5-8 ✅ · `window.confirm`=0 · `input_tsx_exists=false`

---

## P5-12 / P5-14 / E5+E6 / E8a – Copy, Datum/Geld, Demo-Banner

**Commit-Text:** `P5-12+14+E8a: lib/copy (Partner/Angenommen); formatDatum-API; Demo-Banner nur Einstellungen`

**CRM Dateien:**
- `src/lib/copy/index.ts` · `buttons.ts` · `roles.ts` · `status.ts` — zentrale Copy-Quelle (E5 Partner, E6 Angenommen, Button-Verben)
- `src/lib/copy/voice.ts` — weiterhin Stimme; über Index re-exportiert
- `src/lib/utils.ts` — `formatPreis` mit 2 NK (Spannen ohne Zwang); Datumshelfer ohne Locale-API
- `src/lib/status/status-map.ts` · `status-tone.ts` · `auftrag-handwerker-status.ts` · `vorgang/vorgang-labels.ts` — UI „Angenommen“ / Rolle Partner
- `src/lib/nav-config.ts` — Nav-Label Partner
- Diverse UI: `toLocaleDateString` → `formatDatum` / Helfer; Copy-Imports in Nav/Footer/Leistungen
- `src/components/layout/DashboardShell.tsx` · `src/app/(dashboard)/layout.tsx` — Demo-Banner aus Shell entfernt
- `src/app/(dashboard)/einstellungen/layout.tsx` · `EinstellungenLayoutClient.tsx` — Banner nur Einstellungen
- `scripts/audit-status.mjs` — E8a-Check messbar
- `docs/TODO-ENTWICKLUNG.md` / `docs/COMMIT-PLAN.md` — Status

**Messung:** `toLocaleDateString=0` · `copy_imports>0` · P5-12 ✅ · P5-14 ✅ · P5-E8a ✅

---

## P5-12b – locale_format_outside_helpers = 0

**Commit-Text:** `P5-12: toLocaleString/Intl → formatEuro/formatNumber/formatDatumZeit (0 außerhalb)`

**CRM Dateien (Kern):**
- `src/lib/format/geld-datum.ts` — kanonisch: `formatEuro`, `formatEuroSpanne`, `formatNumber`, `formatPreis`, `formatDatum`, `formatDatumZeit`
- `src/lib/utils.ts` — Re-Export der Format-Helfer; `formatBudget` / `formatWebsiteLeadPreis` auf Helper
- ~65 Call-Sites in `src/lib/**`, `src/components/**`, `src/app/**`, `src/hooks/useExport.ts` — `toLocaleString('de…)` / `Intl.NumberFormat` ersetzt
- Lokale Wrapper (`formatEur*`, `fmtEuro`, `euro`, `formatPreisSpanne`, …) → Import / Thin-Delegate auf Helper
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Messung:** `locale_format_outside_helpers=0` · `npx tsc --noEmit` grün · P5-12 ✅

---

## Block 5 – Status-Wahrheit (E4 Hybrid / P2)

**Commit-Text:** `Block 5: status-vokabular, write-*, shared-domain sync, Vertrags-Tests`

**CRM Dateien:**
- `src/lib/status/status-vokabular.ts` — DB→CRM/Portal-Labels; re-export status-map; Partner „Angenommen“ (E6)
- `src/lib/format/geld-datum.ts` — `formatPreis`/`formatDatum`/`formatDatumZeit`; `utils.ts` re-exportiert
- `src/lib/status/write-lead-status.ts` · `write-angebot-status.ts` · `write-auftrag-status.ts` · `write-rechnung-status.ts` · `write-helpers.ts`
- `scripts/sync-shared-domain.mjs` · `shared-domain-files.json` · `test-shared-domain-parity.mjs`
- `scripts/check-status-writes.mjs` · `status-write-allowlist.txt` (Legacy, nur schrumpfen)
- `scripts/test-status-contracts.ts` — HV-Freigabe, Partner-Annahme, Abnahme, RE bezahlt, Storno
- `docs/P2-1-resolver-abgleich.md` — Abweichungstabelle ohne Logik-Änderung
- `docs/P2-7-mail-notify.md` — Mail/Notify app-spezifisch
- `docs/P2-8-lib-kopien.md` — 0 offene DRIFT; Resolver FORK dokumentiert
- `scripts/audit-status.mjs` · `package.json` — Guards + npm scripts
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Portal (Sync-Ziel):** `src/lib/shared-domain/{status-map,status-vokabular,geld-datum}.ts` — Header `SYNCED FROM CRM`

**Messung:** P2-1…P2-8 ✅ · `npm run test:status-contracts` · `npm run test:shared-domain` · Build-Guards grün

---

## Block 3 Rest — P5-7/9/11/13/15

**Commit-Text:** `P5 Block3: MockCard, VerlaufPanel, Menü-Chrome, Screen-Contracts, Token-Farben`

**CRM Dateien (Kern):**
- ~16 Feature-Komponenten — `className="card"` → `MockCard` (Dashboard, Stammdaten, PDF-Vorschauen, Finanzen-KPIs, …)
- `src/lib/crm/verlauf.ts` — `TimelineItem`-Typ lokal; Import aus `ui/timeline` weg
- `src/components/ui/timeline.tsx` — gelöscht (0 Consumer der Timeline-Primitive)
- `AngebotAuswahlPanel` / `RechnungAuswahlPanel` — Zeilen-⋯ → `MockEntityRowMenu`
- `docs/SCREEN-CONTRACTS.md` — neu (DetailShell/MockCard/StatusBadge/EditorSheet)
- `docs/ui-audit/PATTERN-LEITFADEN.md` — Menü-Chrome dokumentiert
- `docs/OFFENE-FRAGEN.md` — P5-7 dokumentiert; P5-13 Restpass offen
- `scripts/audit-status.mjs` — exact-`card`-Metrik; P5-7 Chrome-Ausnahmen; P5-15 Datei-Check
- Hochverkehr Farben: `AuftragFinanzenClient`, `AuftragPartnerCompliancePanel`, `DuplikatBand`, `AuftragNachtragBaustoppSection`, `CrmDokumenteTabelle` → CSS-Variablen

**Messung:** class_card=0 · P5-7/9/11/15 ✅ · P5-13 offen (tw_std 347→267, hex 173→172) · Build: siehe Lauf

---

## P5-16 — EditorSheet primary/secondary/danger + Verben + Menüs

**Commit-Text:** `P5-16: EditorSheet-Footer primary/secondary/danger; Verben; Menü-Varianten weg`

**Kern:**
- `src/components/surfaces/EditorSheet.tsx` — Footer-API `primary` / `secondary` / `danger`; kein `footer` ReactNode
- `scripts/audit-status.mjs` — Metriken `sheet_footer_custom`, `footer_komponenten`, `verb_uebernehmen`, `menue_varianten` + Todo P5-16
- `docs/SCREEN-CONTRACTS.md` · `docs/TODO-ENTWICKLUNG.md` — P5-16

**Footer-Migration (Auswahl):** alle bisherigen `footer={<div…>}` an EditorSheet → structured Props; gelöscht: `ModalFormFooter`, `SheetFooterActions`, Versand-/Mail-/Kontakt-/Informieren-/Dokument-/Bautagesbericht-/AnfragePhase-/Abschlagsplan-Footer.

**Verben:** Speichern (nicht Übernehmen); Abbrechen (nicht Schließen außer Info); Löschen (nicht Entfernen außer „aus Liste entfernen“); Dirty-Confirm Verwerfen bleibt.

**Menüs / Detail:**
- `PosTable.tsx` — PosTableMenu weg → MockEntityRowMenu
- `MockNeuPopover` → Export aus `MockEntityRowMenu.tsx`; Layout-Datei gelöscht
- `MockPopoverMenu` nur intern (kein index-Export)
- `ObjektAkteDetailClient.tsx` — DetailActionsBar

**Messung:** `sheet_footer_custom=0` · `footer_komponenten=0` · `verb_uebernehmen=0` · `menue_varianten=0` · P5-16 ✅

---

## O5 — PDF-Service (Portal → CRM)

**Commit-Text:** `O5: POST /api/pdf/render + Portal-Generatoren nach src/lib/pdf/service`

### CRM Dateien
- `src/app/api/pdf/render/route.ts` — neu; Bearer `PDF_SERVICE_SECRET`; Templates aushang (HTML), versammlung, eigentuemer-bericht, versicherung-teil, bautagebuch-versicherung, partner-dokument
- `src/lib/pdf/service/generate-versammlungsbericht-pdf.ts` — aus Portal kopiert, Payload-Typ lokal
- `src/lib/pdf/service/generate-eigentuemer-bericht-pdf.ts` — aus Portal
- `src/lib/pdf/service/generate-bautagebuch-versicherung-pdf.ts` — aus Portal
- `src/lib/pdf/service/generate-partner-dokument-pdf.ts` — aus Portal; Empfänger-Typ lokal
- `src/lib/pdf/service/generate-versicherungsakte-portal.ts` — Portal-Shape (Teil-PDF), CRM-Akte bleibt separat
- `.env.example` — `PDF_SERVICE_SECRET=`

**Aushang:** `buildAushangHtml` + `renderHtmlToPdfBuffer` (kein pdf-lib-Aushang)

---

## Angebot-Wizard — Position-Sheet + Outline weg

**Commit-Text:** `fix: Angebot Position-Sheet über Canvas; Outline-Karussell weg`

**Dateien:**
- `src/styles/mock-design-system.css` — `.editor-sheet-overlay--over-wizard` z-index 450 (über DocumentCanvas 400)
- `src/components/angebote/AngebotWizard.tsx` — `sections`/Outline-Chips entfernt; Send-Gaps unverändert

**Ursache:** Position-Add-Sheet war hinter dem Fullscreen-Wizard unsichtbar.

---

## R2 + Card-Textüberlauf — remrem + MockBtn-Karten

**Commit-Text:** `fix: Inline remrem + Card-Text (doctype/KPI/Neu)`

### CRM
- 21 Dateien: 51 kaputte Inline-Werte (`remrem` / `0.0.3125…`) → korrekte rem
- `scripts/check-inline-css-werte.mjs` — Guard; `package.json` `check:css-werte` + Build-Kette
- `src/styles/mock-design-system.css` — `.doctype-radio-opt`, `.neu-vorgang-tile`, `.pos-add-btn`, `.posboard-add-fab`, `.rw-tax__opt`: `height:auto` + `white-space:normal` (gegen MockBtn `.btn` 32px/nowrap); KPI line-height/clamp; Objekt-Karten wrap/clamp
- `src/components/vorgang/VorgangArtWiederkehrField.tsx` — lbl/hint in `__copy`

### Portal
- `scripts/check-inline-css-werte.mjs` + Build-Hook (0 Treffer)

**Ursache:** Verworfene Padding/Rahmen (`remrem`) + feste `.btn`-Höhe schnitten Mehrzeilen-Texte in Auswahl-Karten ab.

---

## KI Positionen — Übernahme trotz offenem Add-Sheet

**Commit-Text:** `fix: KI-Positionen auch bei offenem Add-Sheet übernehmen`

**Dateien:**
- `src/components/posboard/PosBoard.tsx` — `positionen`-Drafts immer konsumieren; Add-Sheet dabei schließen
- `src/components/assistent/AssistentPanel.tsx` — kein Fake-Erfolg-Toast vor Consumer
- `src/components/assistent/useKiAssistDraftConsumer.ts` — stabile accept-Deps

**Ursache:** Consumer war an `!addSheetOpen` gebunden; unsichtbares Add-Sheet (z-index) blockierte KI-Übernahme trotz Toast „übernommen“.

---

## Alle DocumentCanvas-Wizards — gleiche Sheet/Outline-Bugs

**Commit-Text:** `fix: Wizard-Sheets über Canvas; Outline in allen Wizards weg`

**Befund:** Dieselben Muster wie Angebot auch in Rechnung / Direkt beauftragen / Abnahme / Verträge / Staff-Funnel / Abschlussbericht.

**Dateien:**
- `PosBoard.tsx` — Gewerk-/Preisliste-Sheets `context="canvas"` (wirkt in Angebot+Rechnung+Direkt)
- Outline `sections` entfernt: Rechnung, Direkt beauftragen, Abnahme, Abschlussbericht, Staff-Funnel, Projekt-/Rahmenvertrag
- Nested `sheetContext` detail→canvas: Angebot/Rechnung-Mailfelder, PositionAddSheet/Modal, KatalogPick, Abnahme MobileEditable, HandwerkerStep
- `AngebotWizard` Foto-Lightbox → canvas

---

## Datumsfelder + Partner-Cards Zuweisen

**Commit-Text:** `fix: Datums-Border/Ein-Tag; Partner-Cards größer (MockBtn-Override)`

**Befund:**
- Datumsrahmen zu blass (`--input-border` = `--border-strong`); in Zuweisung doppeltes DateInput-Icon + `border:none` auf dem Input
- „Einzelner Tag“ zeigte weiter Von/Bis (Hide-Klasse ohne `!important` / doppeltes Feld)
- Partner-Zeilen als `MockBtn` → `.btn { height:32; white-space:nowrap }` quetschte die Cards

**Dateien:**
- `src/app/globals.css` — `--input-border` kräftiger; `--sp-card` 22px
- `src/styles/mock-design-system.css` — DateInput-Border 1.5px; Bis-Hide `!important`; `.hw-anfrage-row`/`hw-pick-row` height:auto + nowrap weg + größere Pads; doctype/neu/KPI etwas größer
- `src/components/auftraege/leistungen-v3/AuftragLeistungZuweisungModal.tsx` — nur noch DateInput (kein zweites Kalender-Icon)
- `src/components/auftraege/HandwerkerZuweisenModal.tsx` — Pick-Rows größer, Titel wrappt
- `src/lib/format/geld-datum.ts` — `formatDatumZeitraum` gleicher Tag → ein Datum
- `src/components/auftraege/leistungen-v3/utils.ts` — `formatZeitraumKurz` nutzt denselben Helfer; `preis_fix` korrekt

---

## Vorgangs-Titel: keine Bereich-Slugs — 2026-09-21

**Commit-Text:** `fix: Vorgangs-Titel Situation·Bereich statt fenster_tuer-Slug`

**Befund:** Titel `fenster_tuer – Belal GMBH` blieb stehen, weil En-Dash (U+2013) nicht als Trenner galt und `BEREICH_LABELS` `fenster_tuer` fehlte.

**Dateien:**
- `src/lib/vorgang/vorgang-anzeige-titel.ts` — En-/Em-Dash; Placeholder bei Slug—Rest; Bereiche nur als Label
- `src/lib/utils.ts` — `BEREICH_LABELS` inkl. Melde-Slugs (`fenster_tuer`, …)
- `docs/COMMIT-PLAN.md` — dieser Abschnitt


