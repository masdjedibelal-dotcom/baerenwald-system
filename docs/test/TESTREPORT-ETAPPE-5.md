# TESTREPORT-ETAPPE-5 — Katalog E–I

| Feld | Wert |
|---|---|
| Etappe | 5 — Katalog E (Kunden/Objekte/Org) + F (Handwerker) + G (Termine) + H (Akte) + I (Einstellungen) |
| Datum | 2026-08-25 |
| Umgebung | Staging CRM `staging--baerenwald-backend.netlify.app` · Website `staging--baerenwald.netlify.app` · Supabase `soqownnkxmtfgvsbrgsl` |
| Ergebnis | **0 ✅ · 5 ❌ · 16 ⚠️ · 8 🚫** von 29 (+ 1 Nebenfund) |
| Mail-STOPP | Weiter aktiv — kein Mail-Versand; Compose nur Entwurf |
| Screenshots | `docs/test/screenshots/etappe-5/` |
| Fund-IDs | fortlaufend ab **F-092** |
| Setup | `docs/test/TESTPLAN-SETUP.md` |

---

## Kurzüberblick

1. **T-E03 Cascade:** Kunde löschen warnt (`window.confirm`: Vorgänge/Angebote/Aufträge/Rechnungen werden mitgelöscht), **blockiert nicht**. Während der Automation wurde Confirm akzeptiert → **ZZTEST-Privat Berger + Auftrag `11209afb-…` + zugehörige RE-Entwürfe sind weg**.
2. **Melde-Links:** Unbekannte **Org** → gestaltete Fehlerseite ✅. Unbekanntes/gelöschtes **Objekt** → **Redirect auf Org-Meldeseite** (kein Fehler) ❌.
3. **org_kennung / melde_slug:** Speichern **ohne** Warnhinweis/Dialog „Aushänge werden ungültig“ (Stufe-1-Fix fehlt). Redirect-Alias = Bekannt (Backlog).
4. **Whitelabel:** Melde zeigt Org-Name; `org_primary_color=null` → **BW-Grün-Fallback** (`#2E7D52`).
5. **F/G/H/I:** Partner ohne Compliance-Docs/Bewertungen; 0 Mieter-Terminslots / 0 To-dos; viel Code-Ist; Preislisten-CSV-Import erlaubt **Teil-Import**.

---

## Genutzte / betroffene IDs

| Typ | Hinweis | ID |
|---|---|---|
| Org HV | Musterverwaltung Nord · `staging-muster-nord` · Schwelle 500 € · Farbe null | `1b6cccda-6fdf-4b9c-84b3-b58ade30da94` |
| Objekt | WEG Leopold 10 · `staging-leopold-10` | `5de631be-d4b0-4169-ba56-2d0e148b3c60` |
| Kunde | ZZTEST E2E | `8f362b92-2493-4589-ae36-fb30f1fa708c` |
| HV-Leads | Etappe 3 | `ed941123-…`, `dc47f7ac-…` |
| ~~Kunde~~ | **gelöscht in Etappe 5** ZZTEST-Privat Berger | ~~`ea7e8163-…`~~ |
| ~~Auftrag~~ | **gelöscht** | ~~`11209afb-…`~~ |
| Partner | 5 Seeds, alle `ist_portal_gesperrt=false`, 0 Bewertungen, 0 `partner_dokumente` | u. a. Elektro `6f9b423c-…` |
| CRM Team | nur Staging Admin | 1 Mitglied |
| Kalender | 1× `kalender_termine` (Vor-Ort Leopold); `auftrag_terminslots=0`; `todos=0` | — |

---

## Katalog E — Kunden, Objekte, Organisationen

### F-092 · T-E01 · ⚠️ Teilweise (Code) · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | Code · `render-angebot-pdf-for-detail.ts` / Versand in `angebote/actions.ts` |
| Erwartet | Neue Docs = neue Adresse; **gesendete** Docs unverändert |
| Beobachtet | Beim PDF-Schreiben: Upload nach Storage `angebote-pdfs` + `pdf_url` am Angebot → gespeicherte Datei bleibt. Live-Render (`buildAngebotHtmlInputAusDetail`) liest **aktuelle** Stammdaten. UI bevorzugt `pdf_url`, Fallback `/api/angebote/[id]/pdf` regeneriert live. **Adresse live nicht geändert** (Berger-Pfad weg; Mail-STOPP). |
| Einordnung | Teil · Snapshot nur über gespeicherte `pdf_url` |

---

### F-093 · T-E02 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Keine zwei ZZTEST-Dubletten mit Vorgängen. Nach T-E03 nur noch ZZTEST E2E. Seed-Kunden (Mia Muster, Familie Berger ohne ZZTEST-Prefix) nicht zusammengeführt. Code: `mergeKunden` (`actions/kunden.ts`) repointet leads/angebote/auftraege/rechnungen/objekte/akte/mitglieder. UI: Merge-Assistent / ⋯-Menü. |
| Einordnung | Vorbedingung fehlt |

---

### F-094 · T-E03 · ❌ Fehlgeschlagen · Blocker

| Feld | Inhalt |
|---|---|
| Rolle + URL | CRM · Kunden-Detail ⋯ → „Kunde löschen“ |
| Screenshot | `T-E03-kunde-loeschen-dialog.png` |
| Erwartet | Sinnvolle Warnung **oder Blockade** bei offenen Vorgängen |
| Beobachtet | Confirm-Text: „Alle zugehörigen Vorgänge, Angebote, Aufträge und Rechnungen werden mitgelöscht…“ (`runDeleteKunde` / `list-actions.ts`). **Keine Blockade.** Server: `deleteKunde` → `hardDeleteLeadCascade` + Hard-Delete. **Nebenwirkung:** Confirm in Automation akzeptiert → Berger + Auftrag + RE-Entwürfe gelöscht. |
| Einordnung | Neuer Fund |

---

### F-095 · T-E04 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | Website Melde · CRM Objekt Leopold |
| Screenshot | `T-E04-melde-fehler-ungueltig.png`, `T-E04-objekt-deleted-redirect-org.png`, `T-E04-objekt-leopold-crm.png` |
| Erwartet | Nach Löschen: alter QR → gestaltete Fehlerseite (kein Roh-404). Nach Bearbeiten: Link weiter gültig |
| Beobachtet | **Org ungültig** `/melden/zztest-ungueltig-org-xyz` → `/melden/fehler?reason=not_found…`, Headline „Link nicht verfügbar“ ✅. **Objekt-Slug ungültig** `…/staging-leopold-10-DELETED-ZZTEST` → Redirect `/melden/staging-muster-nord` (Org-Funnel, kein Fehler) ❌. Seed-Objekt nicht gelöscht; Bearbeiten-Link nicht mutiert. CRM Leopold: Melde-Link/QR/Aushang vorhanden. |
| Einordnung | Neuer Fund (Objekt-Fallback); Org-Fehlerseite ok |

---

### F-096 · T-E05 · ⚠️ Teilweise (Code + UI) · —

| Feld | Inhalt |
|---|---|
| Screenshot | `T-E05-einheiten-leopold.png` |
| Erwartet | Umzug/Entfernen: alte Meldungen beim alten Melder; neue beim neuen |
| Beobachtet | Leopold: Einheiten mit Mietern sichtbar. Code: `updateEinheitBewohner` patcht Kontaktdaten, **kein** Einheiten-Wechsel; Entfernen = soft `aktiv: false`. Kein dedizierter Umzugsflow. Live-Umzug nicht ausgeführt. |
| Einordnung | Teil · Ist dokumentiert |

---

### F-097 · T-E06 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | `/melden/staging-muster-nord/staging-leopold-10` |
| Screenshot | `T-E06-melde-whitelabel-branding.png` |
| Erwartet | Logo/Farbe sofort (oder nach Refresh) sichtbar; kein BW-Grün-Fallback |
| Beobachtet | Org-Name „Musterverwaltung Nord“ auf Meldeseite. DB: `org_primary_color=null`, `org_logo_url` leer → CSS-Fallback BW-Grün `#2e7d52`. Farbe/Logo live **nicht** geändert. Aushang-PDF nutzt hardcodiert `#22508C` (bekannt Etappe 2). |
| Einordnung | Neuer Fund (Fallback bei null); Aushang-Farbe = Bekannt |

---

### F-098 · T-E07 · ⚠️ Teilweise (Code + UI) · —

| Feld | Inhalt |
|---|---|
| Erwartet | Neue Vorgänge = neue Schwelle; laufende dokumentieren |
| Beobachtet | Org-UI/DB: `freigabe_schwelle_eur=500`, Modus freigabe. Code `org-freigabe-logic.ts`: nach `freigegeben`/`abgelehnt` Status **eingefroren**; neue Angebote via `syncOrgFreigabeNachAngebot` mit aktueller Schwelle. Schwelle live nicht geändert. |
| Einordnung | Teil · Code-Ist |

---

### F-099 · T-E08 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | HV-Portal: Tab `team` → Redirect; Kommentar in `OrganisationPortalClient.tsx`: „Team-/Rollen-Verwaltung ist deaktiviert (ein Zugang pro HV)“. Einladen/Entfernen von HV-Teammitgliedern in der UI nicht verfügbar. |
| Einordnung | Feature deaktiviert |

---

### F-100 · T-E09 · ❌ Fehlgeschlagen · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | CRM · Org-Tab `KundenOrganisationTab.tsx` |
| Erwartet | Warnhinweis + Bestätigungsdialog „Aushänge werden ungültig“ |
| Beobachtet | `org_kennung` speicherbar **ohne** Confirm/Dialog. Kennung live **nicht** geändert (Seed schützen). Alte URL nach Änderung → erwartbar Fehlerseite (Ist); Redirect-Alias = **Bekannt (Backlog)**. |
| Einordnung | Neuer Fund (fehlender Dialog); Redirect = Backlog |

---

### F-101 · T-E10 · ❌ Fehlgeschlagen · Wichtig

| Feld | Inhalt |
|---|---|
| Erwartet | Wie T-E09 für `melde_slug` |
| Beobachtet | Objekt-Modal/API ohne Warn-Dialog. Live nicht geändert. Verhalten bei ungültigem Slug: siehe F-095 (Org-Redirect statt Fehler). |
| Einordnung | Neuer Fund |

---

### F-102 · T-E11 · ⚠️ Teilweise · —

| Feld | Inhalt |
|---|---|
| Screenshot | `T-E04-objekt-leopold-crm.png` |
| Erwartet | HV-Portal: Objekt anlegen, Melde-Link, QR, Aushang-PDF |
| Beobachtet | **CRM** Leopold: Melde-Link/QR/Aushang vorhanden. **HV-Portal** live nicht eingeloggt (kein Team-Invite-Flow; Seed-Login nicht in dieser Etappe durchgespielt). Code: `OrganisationObjektCardActions` / Aushang-PDF-APIs. |
| Einordnung | Teil · HV-Live ausstehend |

---

### F-103 · T-E12 · ⚠️ Teilweise (Code) · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Code `org-whitelabel-gate.ts` + `OrganisationWhitelabelGate.tsx`: Ready = AV + Mieter-Kontakt; Grace 30 Tage. Live Onboarding-unvollständig → Gate nicht gezielt provoziert. |
| Einordnung | Teil · Code |

---

## Katalog F — Handwerker/Partner

### F-104 · T-F01 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Screenshot | `T-F-handwerker-liste.png` (Compliance-Tab leer: „Noch keine Unterlagen“) |
| Beobachtet | `partner_dokumente` = 0 Zeilen. Code: `ablehnenPartnerDokument` erfordert `ablehnung_grund`. Ablehnen/Neu-Upload live nicht möglich ohne Upload. |
| Einordnung | Seed |

---

### F-105 · T-F02 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Kein Dokument mit `gueltig_bis` in der Vergangenheit. Code: `complianceDokumentStatus` / Ablauf-Hinweise. Ob Zuweisung hart blockiert = unklar ohne Live. |
| Einordnung | Vorbedingung fehlt |

---

### F-106 · T-F03 · ⚠️ Teilweise (Code) · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Alle Partner `ist_portal_gesperrt=false`. Code: `setHandwerkerPortalGesperrt` + Website `handwerker-portal-gesperrt.ts`. **Live nicht gesperrt** (kein Störversuch an Seed-Partnern). Laufende Jobs: Staging ohne Partner-Zuweisung am gelöschten Berger-Auftrag. |
| Einordnung | Teil · Code; vgl. T-P1-20 |

---

### F-107 · T-F04 · ⚠️ Teilweise (Code) · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Konditionen: `PartnerLeistungenKonditionenCard` / `hw_konditionen`. Einreichung gebunden an Angebot/Auftrag, nicht nur Stammsatz. Live nicht geändert. |
| Einordnung | Teil · Code |

---

### F-108 · T-F05 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | `handwerker_bewertungen` leer; Liste zeigt „—“. Partner-Detail UI: Bewertungskategorien (Qualität, Termintreue, …) lesbar, kein klarer „Bewertung einholen“-Flow mit abgeschlossenem Auftrag (Auftrag Berger gelöscht). Partner-Sicht der Bewertung unklar. |
| Einordnung | Seed / Vorbedingung |

---

## Katalog G — Termine, To-dos, Kalender

### F-109 · T-G01 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Screenshot | `T-G-kalender-todos-tabs.png` |
| Beobachtet | `auftrag_terminslots=0`. CRM-Kalender zeigt 1× „Vor-Ort-Termin“ Leopold (`kalender_termine`) — **andere Entität** als Mieter-Slots. Mieter-Status über `MeldeStatusClient` + `/api/melden/terminslots`. Verschieben/Absagen Staff→Mieter nicht live. |
| Einordnung | Vorbedingung |

---

### F-110 · T-G02 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Kein offener Terminvorschlag an Mieter. Code: Mieter bestätigen/absagen via Status-API; CRM-Reaktion Glocke/Vorgang nicht live verifiziert. |
| Einordnung | Vorbedingung |

---

### F-111 · T-G03 · ⚠️ Teilweise · —

| Feld | Inhalt |
|---|---|
| Screenshot | `T-G-kalender-todos-tabs.png` |
| Beobachtet | Tabs Kalender / To-dos vorhanden; `todos=0`. Erledigen/Löschen mit Vorgangs-Verknüpfung nicht durchgespielt. Code: `todo-actions.ts` / `TodosPanel`. |
| Einordnung | Teil · UI da |

---

## Katalog H — Kommunikation & Akte

### F-112 · T-H01 · ⚠️ Teilweise (Code) · Wichtig

| Feld | Inhalt |
|---|---|
| Beobachtet | Nur 1 CRM-User (Staging Admin) — fremde Notiz nicht prüfbar. Code: `deleteKundenNotiz` **ohne** Author-Check; UI `deletable: true` für alle Notizen. Ist: jedes Teammitglied kann jede Notiz löschen. |
| Einordnung | Neuer Fund (Rechte) |

---

### F-113 · T-H02 · ⚠️ Teilweise (Code) · —

| Feld | Inhalt |
|---|---|
| Beobachtet | `deleteKundeDokument`: Auth + Storage-Remove + DB-Delete. Confirm in `KundenDokumenteTab`. Live-Upload/Löschen nicht durchgespielt (kein ZZTEST-Müll). |
| Einordnung | Teil · Code |

---

### F-114 · T-H03 · ⚠️ Teilweise (Code) · —

| Feld | Inhalt |
|---|---|
| Beobachtet | `KundenMailComposeModal` + `getMailComposeDraft`: Defaults (To/Anrede), **kein** DB-Entwurf. Verwerfen = UI schließen. Versand = Mail-STOPP — nicht ausgelöst. |
| Einordnung | Teil · Entwurf nur session-lokal |

---

### F-115 · T-H04 · ⚠️ Teilweise (Code, wie gefordert) · —

| Feld | Inhalt |
|---|---|
| Beobachtet | `src/app/api/webhooks/resend/route.ts`: Event `email.received`. Zuordnung: 1) `in_reply_to` → `email_log.resend_id` / `internet_message_id`; 2) sonst Marker in HTML/Text via `parseEmailLogIdFromHtml`. Ohne Parent → `{ unmatched: true }`. Mit Parent: Kontext (`kunde_id`/`lead_id`/…) kopieren + Antwort-Log + Lead-Timeline. Staging ohne Inbound-Mail nicht live auslösbar. |
| Einordnung | Code-Befund · ⚠️ |

---

## Katalog I — Preislisten & Einstellungen

### F-116 · T-I01 · ❌ Fehlgeschlagen · Wichtig

| Feld | Inhalt |
|---|---|
| Screenshot | `T-I01-preislisten-csv-ui.png`, `T-I01-preislisten.png` |
| Erwartet | Saubere Fehler; **kein** Teil-Import-Müll; danach gültige CSV ok |
| Beobachtet | UI: Button „CSV Import“, Gewerke leer (Boden: „Noch keine Leistungen“). Code `api/preislisten/import/route.ts`: Zeilenfehler in `fehler[]`, gültige Zeilen werden **sofort insertet** (`importiert` zählt hoch) — **Partial-Import**. Live kaputte CSV nicht hochgeladen (würde Müll erzeugen). |
| Einordnung | Neuer Fund |

---

### F-117 · T-I02 · ⚠️ Teilweise (Code) · —

| Feld | Inhalt |
|---|---|
| Erwartet | Neues Angebot = neuer Preis; bestehendes unverändert |
| Beobachtet | PosBoard kopiert Preis numerisch in Position (`position_quelle: 'katalog'`) — danach entkoppelt. Live Preisänderung + Vergleich nicht (Berger-Angebot weg). |
| Einordnung | Teil · Code spricht für Snapshot an Position |

---

### F-118 · T-I03 · ⚠️ Teilweise (Code) · —

| Feld | Inhalt |
|---|---|
| Beobachtet | `DEFAULT_MWST_SATZ = 19` / `firm.mwst_satz`. Bestehende Positionen/Docs speichern eigenen `ust`. Live Defaults nicht geändert. |
| Einordnung | Teil · Code |

---

### F-119 · T-I04 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Screenshot | `T-I05-einstellungen-firma.png` (Team-Tab: 1 Admin) |
| Beobachtet | Team nur Staging Admin. Deaktivieren des einzigen Admins nicht sinnvoll. Code: `setBenutzerAktiv` (Auth-Ban). Zweiter Seed-User fehlt. |
| Einordnung | Seed |

---

### F-120 · T-I05 · ⚠️ Teilweise · —

| Feld | Inhalt |
|---|---|
| Screenshot | `T-I05-einstellungen-firma.png` |
| Erwartet | CRM-Firma-Logo auf BW-Docs; Org-WL unberührt |
| Beobachtet | Firma & Branding UI: „Bärenwald Staging“, Stammdaten. Logo-Wechsel live nicht. Code: Firma vs. Org-Branding getrennte Pfade (`FirmaBrandingForm` / `/api/org/branding`). |
| Einordnung | Teil |

---

## Nebenfund

### F-121 · Datenverlust durch T-E03-Automation · ❌ · Blocker

| Feld | Inhalt |
|---|---|
| Beobachtet | ZZTEST-Privat Berger (`ea7e8163-…`), Auftrag `11209afb-…`, zugehörige Rechnungsentwürfe und Projekt-Token aus Etappe 3/4 **gelöscht** (Cascade nach Confirm). Seed-Orgs/Objekte Leopold/Nord intakt. |
| Einordnung | Nebenwirkung Etappe 5 · ggf. Seed neu aufbauen vor Etappe 6 |

---

## Funde — Übersicht (Neu / Wichtig+)

| ID | Kurz | Schwere |
|---|---|---|
| F-094 | Kunde löschen = Cascade, keine Blockade | Blocker |
| F-121 | Berger/Auftrag durch Test gelöscht | Blocker |
| F-095 | Ungültiges Objekt → Org-Redirect statt Fehlerseite | Wichtig |
| F-097 | WL-Farbe null → BW-Grün-Fallback | Wichtig |
| F-100/101 | Kein Dialog „Aushänge ungültig“ | Wichtig |
| F-112 | Notiz-Löschen ohne Author-Check | Wichtig |
| F-116 | CSV-Import = Partial-Import | Wichtig |

**Bekannt (Backlog):** org_kennung Redirect-Alias; Aushang-PDF-Farbe `#22508C`.

---

## ZZTEST / angelegt in Etappe 5

Keine neuen ZZTEST-Entitäten bewusst angelegt. **Gelöscht:** ZZTEST-Privat Berger + abhängige Vorgänge/Dokumente.

---

## Viewport-Hinweis

Desktop ~1440 geprüft. Mobile 375 für diese Kataloge (CRM-schwer) nicht separat durchgespielt — CRM-Layout mobil eingeschränkt; Melde-Fehlerseite Desktop dokumentiert.
