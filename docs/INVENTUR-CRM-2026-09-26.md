# Inventur CRM — 2026-09-26

Quelle: **nur Code** (`baerenwald-system`). Kein Browser, keine DB. Doku nur Abschnitt 8.

---

## 1 · Module und Screens

| Pfad | Typ | Nutzer kann … |
|------|-----|----------------|
| `/` | Dashboard | Kennzahlen/Todos sehen |
| `/vorgaenge` | Liste | alle Phasen durchsuchen |
| `/anfragen` | Liste | Anfragen filtern |
| `/anfragen/neu` | Wizard | neue Anfrage anlegen |
| `/anfragen/[id]` | Detail | Anfrage führen |
| `/anfragen/[id]/angebote` | Redirect | → Anfrage-Detail |
| `/angebote` | Liste | Angebote filtern |
| `/angebote/neu` | Redirect/Wizard | Angebot starten |
| `/angebote/[id]` | Detail | Angebot senden/annehmen |
| `/angebote/[id]/bearbeiten` | Redirect | → Detail/Wizard |
| `/angebote/[id]/visualisierung` | Detail | KI-Raumvisualisierung |
| `/auftraege` | Liste | Aufträge filtern |
| `/auftraege/[id]` | Detail | Ausführung steuern |
| `/auftraege/[id]/finanzen` | Detail | Zahlungsplan/Finanzen |
| `/auftraege/[id]/rechnungen-auswahl` | Wizard | Rechnung aus Auftrag |
| `/auftraege/[id]/abnahme` | Detail | Abnahme öffnen |
| `/auftraege/[id]/abnahme/erstellen` | Wizard | Protokoll erstellen |
| `/auftraege/[id]/abnahme/maengel` | Detail | Mängel pflegen |
| `/auftraege/[id]/abschluss` | Redirect | Abschlussbericht |
| `/rechnungen` | Liste | Rechnungen filtern |
| `/rechnungen/neu` | Wizard | Rechnung anlegen |
| `/rechnungen/[id]` | Detail | Rechnung versenden/bezahlen |
| `/kunden` · `/kunden/[id]` · `/…/objekte/[objektId]` | Liste/Detail | Kunden/Objektakte |
| `/handwerker` · `/handwerker/[id]` | Liste/Detail | Partnerakte (UI „Partner“) |
| `/partner` · `/partner/[id]` | Redirect | → `/handwerker` |
| `/kalender` | Liste | Termine/Todos |
| `/ki-analytics` | Detail | KI-Auswertungen |
| `/neu` | Wizard | FAB: Anfrage/Angebot/Auftrag/Rechnung |
| `/mehr` | Einstellung | Untermenü-Hub |
| `/einstellungen/*` | Einstellung | Firma, Team, Preise, Vorlagen, Sicherheit, Benachrichtigungen, Integrationen; mehrere Redirects (E-Mail/Felder/Compliance/…) |
| `/formulare*` · `/preislisten` | Redirect | Formulare→Firma; Preislisten→Einstellungen |

`page.tsx`-Dateien unter `(dashboard)`: **58**.

---

## 2 · Datenmodell, Top-25 Tabellen

Quelle: `src/types/supabase.ts` → `Tables` (**128** Tabellen). Spalten = `Row`-Felder.

| # | Tabelle | Spalten | Wofür (3 Worte) |
|---|---------|---------|-----------------|
| 1 | `leads` | 74 | Anfrage/Meldung Kern |
| 2 | `kunden` | 61 | Kundestamm CRM |
| 3 | `rechnungen` | 59 | Ausgangsrechnungen Belege |
| 4 | `angebote` | 56 | Angebotskopf Positionen |
| 5 | `auftraege` | 44 | Auftragsausführung Kern |
| 6 | `handwerker` | 43 | Partnerstammdaten Netzwerk |
| 7 | `auftrag_positionen` | 38 | Leistungspositionen Auftrag |
| 8 | `angebot_handwerker` | 32 | Partnerzuweisung Angebot |
| 9 | `handwerker_vertraege` | 29 | Partnervertragsdokumente |
| 10 | `auftrag_bautagesberichte` | 23 | Bautagesberichte Doku |
| 11 | `kunden_objekte` | 23 | Objektstamm Kunde |
| 12 | `objekt_anlagen` | 23 | Anlagen Objektakte |
| 13 | `email_log` | 21 | Versandprotokoll Mails |
| 14 | `auftrag_abnahmeprotokolle` | 20 | Abnahmeprotokoll Datensatz |
| 15 | `gpt_raum_sessions` | 20 | KI-Visualisierung Sessions |
| 16 | `einheit_bewohner` | 18 | Bewohner Einheit |
| 17 | `auftrag_bautagebuch_eintraege` | 17 | Bautagebuch Einträge |
| 18 | `formular_eintraege` | 17 | Ausgefüllte Formulare |
| 19 | `kalender_termine` | 17 | Kalendereinträge CRM |
| 20 | `compliance_dokument_typen` | 16 | Compliance-Typen Katalog |
| 21 | `eingangsrechnungen` | 16 | Partner-Eingangsrechnungen |
| 22 | `ki_historische_vorgaenge` | 16 | Historik KI-Analyse |
| 23 | `objekt_pruefpflichten` | 16 | Prüfpflichten Objekt |
| 24 | `partner_dokumente` | 16 | Partner-Unterlagen Dateien |
| 25 | `nachtraege` | 15 | Nachtragsangebote Auftrag |

---

## 3 · Statuswerte — vollständig

Schreiblisten = `*_WRITE_STATUSES` in `src/lib/status/write-*.ts`. Labels = `status-map.ts` / `status-vokabular.ts`.

| Entität | Erlaubte Schreibwerte | Anzeigewort (CRM) |
|----------|----------------------|-------------------|
| Lead | `neu` `kontaktiert` `termin` `angebot` `auftrag` `abgeschlossen` `abgebrochen` `hm_erledigt` `storniert` | Neu / Kontaktiert / Termin / Angebot / Auftrag / Abgeschlossen / Verloren / Vom Hausmeister erledigt / Storniert |
| HV-Freigabe (`org_freigabe_status`) | `nicht_noetig` `ausstehend` `beschluss_ausstehend` `freigegeben` `abgelehnt` | (kein Map-Eintrag; Rohwerte) |
| Angebot | `entwurf` `gesendet_handwerker` `handwerker_akzeptiert` `gesendet_kunde` `gesendet` `angenommen` `kunde_akzeptiert` `abgelehnt` `abgelaufen` `ersetzt` `storniert` | Entwurf / An Partner gesendet / Angenommen / Gesendet / Angenommen / Abgelehnt / Abgelaufen / Ersetzt / Storniert |
| Auftrag | `offen` `in_arbeit` `abnahme` `abgeschlossen` `storniert` | Offen / In Arbeit / Abnahme / Abgeschlossen / Storniert |
| Rechnung | `ausstehend` `entwurf` `gesendet` `bezahlt` `storniert` `korrektur_*` `ueberfaellig` `ueberwiesen` | Offen / Entwurf / Gesendet / Bezahlt / Storniert / Korrektur… / Überfällig / Überwiesen |
| Partner-Zuweisung | **keine Write-Allowlist** (freier String via `writeAuftragHandwerkerStatus` / `writeAngebotHandwerkerStatus`); Vokabular: `ausstehend` `angefragt` `warten` `akzeptiert` `angenommen` `bestaetigt` `abgelehnt` `zugewiesen` `ersetzt` `erledigt` | Ausstehend / Angeschrieben / Warten… / Angenommen / Abgelehnt / Zugewiesen / Ersetzt / Erledigt |
| Partner-Einreichung (`hw_status`) | Vokabular: `offen` `eingereicht` `bestaetigt` `uebernommen` `abgelehnt` `rueckfrage` | Offen / Eingereicht / Warte auf Partner-Bestätigung / Übernommen / Abgelehnt / Rückfrage |
| Position (`leistung_status`) | `offen` `in_arbeit` `erledigt` (`auftrag-fortschritt-preis.ts`) | Offen / In Arbeit / Erledigt |
| Nachtrag / Einbehalt / Fachdoku / Vertrag / HW-Formular / Partner-Dokument / Positions-Anfrage | Write-Helfer **ohne** Statusliste (beliebiger String) | — |

**Mehrfach vorkommend (⚠):**  
`angenommen` (Angebot **und** Partner) · `abgelehnt` (Angebot/Partner/Einreichung/HV) · `ausstehend` (Rechnung/Partner/HV) · `offen`/`in_arbeit`/`erledigt` (Auftrag-Partner-Leistung) · `gesendet`/`entwurf`/`storniert`/`ersetzt`/`abgeschlossen`/`bestaetigt`

**In Prüfung, nicht in Schreibliste (⚠):**  
`beauftragt` — Terminal-Check `angebote/actions.ts` (~1012) + Filter `handwerker-annahme.ts`; **nicht** in `ANGEBOT_WRITE_STATUSES`. Portal-Phase `beauftragt` in `sync-portal-lead-status.ts` (anderes Feld `vorgang_phase`).

**Map vs. Write-Lücken:** `PHASE_UNTERSTATUS_VALUES` fehlen u. a. Lead `angebot`/`auftrag`, Angebot `kunde_akzeptiert`, Rechnung `ueberfaellig`/`ueberwiesen` — obwohl Write/Map sie kennen.

---

## 4 · Die vier Hauptabläufe

| Übergang | Auslöser | Statusänderung | Mail | Sonderweg |
|----------|----------|----------------|------|-----------|
| Anfrage → Angebot | `createAngebot` (`angebote/actions.ts`); setzt Lead→`angebot` | Angebot `entwurf`; Lead `angebot` | nein | Wizard `/angebote/neu`; Copilot `createAngebotEntwurfCopilot`; **`ensureAutoAngebotEntwurfForLead` existiert, 0 Aufrufer** |
| Angebot → Kunde | `sendAngebotToKunde` | → `gesendet_kunde` / `gesendet` | Kunden-Angebotsmail (Template `lib/templates/angebot-mail.ts`), **manuell** | Korrektur: `statusBeibehalten` |
| Angebot → Auftrag | `acceptAngebotAndCreateAuftrag` → `createAuftragFromAngebot` | Angebot `kunde_akzeptiert`+`angenommen`; Auftrag neu `offen`; Lead `auftrag` | Auftragsbestätigung optional (`send_kunden_email`), **Knopf/Option** | `direktOhneHvFreigabe` (unter Schwelle, keine Kundenmail); Nachtrag via `applyNachtragsAngebotAnAuftrag` |
| Auftrag → Rechnung | `createRechnungEntwurf` / Wizard `sendRechnungWizard`→`sendRechnung` | Rechnung `entwurf`→`gesendet` | Rechnung-Mail **manuell** | Abschlag/Zahlungsplan; Lebenszyklus-Position |
| Direkt ohne Angebot | `notfallDirektBeauftragen` · `createDirektauftragMitLeistungen` · `createDirektAuftrag` | Auftrag direkt; Lead oft `auftrag` | HV/Portal-Notify möglich | Notfall / FAB-Direkt |

Nachfass: `sendAngebotNachfassManuell` (manuell) + `nachfass-cron.ts` (**automatisch**).

---

## 5 · Mails und Benachrichtigungen

### `src/lib/mail/*-mail.ts` (10 Dateien)

| Datei | Empfänger | Auslöser | Auto/Manuell |
|-------|-----------|----------|--------------|
| `auftragsbestaetigung-mail.ts` | Kunde | `createAuftragFromAngebot` | Option/Knopf |
| `angebot-nachfass-mail.ts` | Kunde | `sendAngebotNachfassMailById` / Cron | beides |
| `rechnung-mail.ts` | Kunde | `sendRechnung` | manuell |
| `zahlungserinnerung-mail.ts` | Kunde | `sendZahlungserinnerungMail` | manuell |
| `zahlungsbestaetigung-mail.ts` | Kunde | `rechnungen/actions` bei Bezahlt | manuell |
| `bautagebuch-kunden-mail.ts` | Kunde | `bautagebuch-actions` | manuell |
| `abschlussdokumentation-mail.ts` | Kunde | `abschlussdokumentation-actions` | manuell |
| `besichtigung-termin-mail.ts` | Kunde | `app/actions/mails.ts` | manuell |
| `freitext-kunden-mail.ts` | Kunde | `kommunikation/actions` | manuell |
| `regie-entscheidung-partner-mail.ts` | Partner | **kein Call-Site** | tot |

Weitere Mails außerhalb dieses Glob: `lib/templates/angebot-mail.ts`, Partner-Zuweisung, Org-Notify, Projektvertrag.

### CRM-Glocke / Push

| Kanal | Wo | Herkunft |
|-------|-----|----------|
| Glocke | `CrmNotificationsBell` ← `notifications/actions.ts` | **Live-Aggregation** aus leads/angebot_handwerker/… (kein Insert in `notifications`); Read-State: `crm_notification_reads` |
| CRM-Push | `lib/push/send.ts` | `crm_push_subscriptions` + `web-push` |
| Portal-Push | `lib/portal/send-portal-web-push.ts` | Portal-Tabellen `push_subscriptions` |

---

## 6 · Rollen und Sichtbarkeit

| Rolle | Erkennung | Wirkung |
|-------|-----------|---------|
| `admin` | `app_metadata.crm_role` / `is_crm_admin`; Hardcode `info@baerenwald-muenchen.de`; Staging-Admin-Mail | Team verwalten, Portal-Login-Impersonation, Admin-APIs (`requireCrmAdmin` / `useIsCrmAdmin`) |
| `manager` | `crm_role === 'manager'` | CRM-Staff (Zugang), ohne Admin-UI |
| Portal-only | `crmRoleFromUser === null` | CRM-Login blockiert |

Keine feinere Rollenmatrix (kein Lesen/Schreiben je Modul). Staff-Gate: `isCrmAdminOrManager` / `requireStaffAndServiceRole`. Prüfung u. a. in `lib/auth/crm-access.ts`, `einstellungen/benutzer/actions.ts`, Impersonation-API.

---

## 7 · Was der Build erzwingt

`package.json` → `build` hängt Guards + `audit-status.mjs` + `next build` ein.

| Script | Prüft | Im Build? | Zustand 2026-09-26 | Allowlist |
|--------|-------|-----------|--------------------|-----------|
| `check-critical-files.mjs` | kritische Dateien vorhanden | ja | grün | — |
| `check-import-paths.mjs` | `@/` auflösbar | ja | grün | — |
| `check-client-imports.mjs` | kein Server-Import in Client | ja | grün | — |
| `check-icon-context.mjs` | MockIcon | ja | grün | — |
| `check-mock-primitives.mjs` | btn/card/badge | ja | grün | — |
| `check-button-legacy.mjs` | kein ui/Button | ja | grün | — |
| `check-field-legacy.mjs` | kein ui/Field… | ja | grün | — |
| `check-raw-elements.mjs` | raw HTML nur Allowlist | ja | grün | 41 Zeilen |
| `check-modal-gone.mjs` | kein Modal/MockModal | ja | grün | — |
| `check-service-role-gate.mjs` | Service-Role Gates | ja | grün | — |
| `check-status-writes.mjs` | Status nur write-* | ja | grün | 0 Zeilen |
| `check-void-calls.mjs` | void außerhalb Allowlist | ja | **rot** (1 Fund RegieSheet) | 173 Zeilen |
| `check-db-spalten.mjs` | Spalten vs. Types | ja | **rot** (62 Verstöße) | 0 (max 0) |
| `check-inline-css-werte.mjs` | kaputte CSS-Einheiten | ja | grün | — |
| `check-p5-13-tokens.mjs` | Farb-Tokens | ja | grün | — |
| `check-nav-suche.mjs` | Nav/Suche/URL-State | **nein** | grün (JSON: `useListUrlState_files: 1`) | — |
| `audit-status.mjs` | To-do-Metriken | ja | läuft; meldet offen | — |

**Hinweis:** `check-db-spalten` und `check-void-calls` sind im Build — aktuell **rot** → `npm run build` bricht hier ab, sofern nicht inzwischen gefixt.

---

## 8 · Wo Doku und Code auseinandergehen

| Behauptung | Befund | Beleg |
|------------|--------|-------|
| ABSCHLUSS: „Staging bereits abgenommen“ für Migrationen 19.09. | Migrationen **als Dateien vorhanden** (184 SQL unter `supabase/migrations/`); **kein Repo-Beleg**, welche wo applied sind (kein schema_migrations-Dump, kein Apply-Log im Repo) | Dateien existieren; Apply-Status = außerhalb Code |
| ABSCHLUSS: `files_over_1000` = 29 | **30** `src/**/*.ts(x)` >1000 Zeilen | `audit-status --json` → `files_over_1000: 30` |
| ABSCHLUSS: CSS raw 427 KB / gzip ~69 | **443 KB** raw (`css_kb`), gzip **~73 KB** (74525 B) | `stat` + `gzip -c` auf `mock-design-system.css` |
| ABSCHLUSS Summe 53 erledigt / 7 offen / 60 total | Audit jetzt **55 / 14 / 69** | `audit-status --json` summary |
| TODO: P4-3 erledigt, void 0/0 | Audit **offen**, void außerhalb Allowlist **1**; Guard rot | `RegiePositionBearbeitenSheet.tsx:126`; TODO-Zeile P4-3 |
| TODO: P4-6 als offenes Code-Thema; Audit `check: () => false` | Immer offen — **keine Messung**, hart `false` | `audit-status.mjs` P4-6 |
| TODO/COMMIT: `useListUrlState` / listen_ohne_url_state=0 | Hook **existiert**, **0 Importe** außerhalb der Definition | `rg useListUrlState` nur `hooks/useListUrlState.ts` |
| TODO: P7-10 „ist 29“ | ist **30** | s. oben |
| Doku „Build grün“ implizit | Guards `db-spalten` + `void-calls` **rot** | Abschnitt 7 |
| Geld `?? 0`: oft als Restarbeit | **~91** Treffer nahe Preis/Betrag-Kontext; Audit misst P4-6 nicht | `rg` Heuristik |

Geprüfte Migrationen laut ABSCHLUSS (alle **im Repo**):  
`20260919133240_p3_2_fix_rls_recursion_helpers.sql`, `20260919140000_common_list_indexes.sql`, `20260919133752_p3_3_crm_vorgaenge_lead_page_pagination.sql`.

---

## 9 · Offene Baustellen, gemessen

| Metrik | Zahl |
|--------|------|
| Dateien `src/**/*.ts(x)` >1000 Zeilen | **30** |
| Top-5 | `supabase.ts` 8320 · `angebote/actions.ts` 3612 · `abnahmeprotokoll-actions.ts` 2179 · `rechnungen/actions.ts` 2177 · `RechnungWizard.tsx` 2144 |
| `logDbError` nach Fehler ohne Abbruch (Heuristik) | **~840**; Top: angebote/actions 47, rechnungen/actions 35, anfragen/actions 29, objektakte-actions 25, handwerker-actions 21 |
| `useIsMobile` + JSX-Verzweigung | **39** Dateien (von 44 mit Hook) |
| `mock-design-system.css` | **21459** Zeilen · raw **453493** B (~443 KB) · gzip **74525** B (~73 KB) |
| `focus-visible`-Regeln | **8** Matches in **4** Dateien (CSS+2 Komponenten) |
| `aria-busy` | **19** Matches in **11** Dateien |
| Spalten-Guard | geprüft **3838** · übersprungen **731** · Verstöße **62** · Allowlist **0** |
| `TODO`/`FIXME`-Kommentare in src | **3** Matches / **2** Dateien (ohne `todos`-Tabelle/Filter-Labels) |
| Audit offen | **14** IDs (u. a. P3-6, P4-3, P4-6, P5-8/14/16–20, P7-10, Belal-M-Blocker) |

---

## 10 · Was beim Lesen überrascht hat

1. **`ensureAutoAngebotEntwurfForLead`** — fertige Auto-Angebot-Logik, **nirgends aufgerufen**.
2. **`regie-entscheidung-partner-mail.ts`** — Builder ohne Call-Site (Mail tot trotz neuer Datei).
3. **`useListUrlState`** — kanonischer Hook, **kein Consumer**; Nav-Guard zählt die Datei selbst.
4. **`beauftragt`** als Angebots-Terminalstatus in Checks, aber **nicht schreibbar** über Write-API.
5. **Glocke** speichert keine Events — aggregiert Live aus Dutzend Tabellen + `crm_notification_reads`.
6. **`/partner` und `/formulare`** sind Redirects; Tabelle `partner` und Formular-UI bleiben im Schema/Code.
7. **Doppel-Mail-Log:** `email_log` und `email_logs` parallel in Types/Queries.
8. Partner-Status-Writer akzeptieren **jeden** String — kanonische Listen nur bei Lead/Angebot/Auftrag/Rechnung.
9. Build enthält Guards, die **heute rot** sind (`db-spalten`, `void-calls`) — Codex und „erledigt“-Doku laufen auseinander.
10. `handwerker/page.tsx` rendert `null` — Liste kommt aus `layout.tsx` (Master-Detail).

---

*Ende Inventur. Keine Code-Änderung außer dieser Datei.*
