# TESTREPORT-ETAPPE-6 — Produktlogik & Robustheit

| Feld | Wert |
|---|---|
| Etappe | 6 — Produktlogik (T-L) + Robustheit (T-R) |
| Datum | 2026-08-25 |
| Umgebung | Staging CRM `staging--baerenwald-backend.netlify.app` · Website `staging--baerenwald.netlify.app` · Supabase `soqownnkxmtfgvsbrgsl` |
| Ergebnis | **3 ✅ · 3 ❌ · 9 ⚠️ · 0 🚫** von 15 |
| Mail-STOPP | Weiter aktiv — kein Partner-/Freigabe-Versand ausgelöst |
| Screenshots | `docs/test/screenshots/etappe-6/` |
| Fund-IDs | fortlaufend ab **F-122** |
| Setup | `docs/test/TESTPLAN-SETUP.md` |
| Hinweis | MCP `execute_sql` auf Staging **read-only** (kein UPDATE für Freigabe-Ausstehend-Setup) |

---

## Kurzüberblick

1. **T-L01 Lücke:** Partner-Versand über `sendHandwerkerAnfrageFuerZuweisung` ist bei `ausstehend`/`abgelehnt` geblockt — **Auftrag „an HW senden“ hat kein Org-Freigabe-Gate**.
2. **T-L02 Lücken-Kandidat bestätigt (Code):** Nach `freigegeben` friert `syncOrgFreigabeNachAngebot` den Status ein (Q6) — Betragserhöhung über Schwelle setzt **keine** neue Freigabe. Nachtrag-Pfad kann dagegen wieder `ausstehend` setzen.
3. **T-L06:** Wizard-Gate erlaubt `kunde_akzeptiert` weiter; Detail-CTA enger — kein „deaktiviert-mit-Grund“.
4. **Robustheit:** XSS-Notiz ✅ ohne Script-Ausführung; Empty-State Wartung ✅; Portal-Falschpasswort verständlich, **kein App-Lockout**; Dirty-Check Angebot-Wizard ❌ (kein `beforeunload`).
5. Staging: 0 Aufträge, 0 angenommene Angebote (Berger-Cascade Etappe 5); E2E-Leads `nicht_noetig`; 3 Seed-Leads `freigegeben`.

---

## Genutzte IDs

| Typ | Hinweis | ID |
|---|---|---|
| Lead E2E Duplikat | `org_freigabe_status=nicht_noetig` | `dc47f7ac-2c23-4655-851d-a409b52bfa22` |
| Lead E2E primär | Status termin · nicht_noetig | `ed941123-35ac-485b-b69d-e3ffee6a95fe` |
| Lead Freigabe | Steckdosen · `freigegeben` · Status DB `auftrag` | `22eac221-036c-42c2-bd24-21bf9a448b98` |
| Org | Musterverwaltung Nord · Schwelle 500 € | `1b6cccda-…` |
| ZZTEST Notiz | XSS-Probe in Akte Lead 22eac221 | Text siehe F-130 |

---

## Produktlogik

### F-122 · T-L01 · ❌ Fehlgeschlagen · Blocker

| Feld | Inhalt |
|---|---|
| Rolle + URL | Code + CRM · kein Lead mit `ausstehend` live (MCP Write blockiert) |
| Erwartet | Jeder Weg zum Partner-Versand blockiert inkl. verständlicher Hinweis |
| Beobachtet | **Gate:** `orgFreigabeBlockiertPartner` bei `ausstehend`/`abgelehnt`. **Geblockt:** `send-handwerker-anfrage.ts` (Anfrage-HW, Angebot-Actions, API senden) mit Hinweis „Wartet auf Org-Freigabe…“. **Bypass:** `hv_meldung_status=notmassnahme`; **Auftrag-Pfad** `sendAuftragLeistungenAnHandwerkerV3` / `send-auftrag-handwerker-zuweisung-mail.ts` **ohne** Freigabe-Check. Zuweisung-Insert vor Send in Anfrage-HW möglich. Live alle Wege bei `ausstehend` nicht durchgeklickt (kein Seed-Status). |
| Einordnung | Neuer Fund (Auftrag-Pfad ohne Gate) |

---

### F-123 · T-L02 · ⚠️ Teilweise (Code + UI) · Wichtig

| Feld | Inhalt |
|---|---|
| Screenshot | `T-L02-freigabe-badge-detail.png` |
| Erwartet | Ist dokumentieren: neue Freigabe nötig oder rutscht durch? |
| Beobachtet | Lead `22eac221-…` zeigt Badge **„Freigegeben“**. Code `syncOrgFreigabeNachAngebot`: wenn Status `freigegeben`/`abgelehnt` → **sofort Return** (Q6) — Betragserhöhung ändert Status **nicht** (Flag `org_freigabe_erforderlich` am Angebot kann true werden, Status bleibt freigegeben). **Nachtrag:** `syncOrgFreigabeNachNachtrag` setzt bei `freigegeben`+über Schwelle wieder `ausstehend`. Live AG-Korrektur/Erhöhung nicht ausgeführt (Mail-STOPP / kein akzeptiertes Angebot). |
| Einordnung | **Lücken-Kandidat** · Neuer Fund (Angebot-Korrektur friert durch) |

---

### F-124 · T-L03 · ⚠️ Teilweise · —

| Feld | Inhalt |
|---|---|
| Erwartet | Notfall-Badge Liste + Detail; sinnvolle Priorisierung |
| Beobachtet | E2E-Meldungen `funnel_daten.notfall=false`. Liste zeigt Status-Badges (Neu/Termin/…), **kein** separates Notfall-Badge in `VorgaengeListeClient`. Code: `leadIstHavarie` / `badges.notfall` / `VorgangResolverBanner`; Auftrag-Flag `ist_notfall`. Live Notfall-Meldung nicht neu angelegt. |
| Einordnung | Teil · vgl. T-A08 Etappe 3 |

---

### F-125 · T-L04 · ⚠️ Teilweise · —

| Feld | Inhalt |
|---|---|
| Screenshot | `T-L04-vorgaenge-filter-wartung.png`, `T-L04-wartung-empty.png` |
| Erwartet | Filter „Wartung & Pflege“ zeigt nur wiederkehrende; normale nicht |
| Beobachtet | Chip **Wartung & Pflege 0** → Empty-State „Keine Vorgänge“ / „Filter zurücksetzen…“ (MockEmpty). Filter = `ist_wiederkehrend` (`bestand`). **Kein** Wartungs-Vorgang angelegt (würde Mail/Setup brauchen). Inverse (normale Vorgänge nicht im Filter) durch leeren Bestand plausibel, nicht mit positivem Treffer bewiesen. |
| Einordnung | Teil · Filter-UI ok |

---

### F-126 · T-L05 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Screenshot | `T-L05-projekt-kette-anfrage.png` |
| Erwartet | Kette Kunde→Anfrage→Angebot→Auftrag überall sichtbar und klickbar |
| Beobachtet | Phase-Strip sichtbar: Anfrage klickbar; Angebot/Auftrag/Rechnung **disabled** „noch nicht erstellt“. Lead `22eac221` DB `status=auftrag` + `freigegeben`, aber **kein** Auftrag/Angebot in DB → Kette vs. Lead-Status inkonsistent. `PhaseCard`/`ZugehoerigListe` im Code **ungenutzt**; aktiv: `VorgangPhasenVerlauf` / `EntityProjektUebersichtCard`. |
| Einordnung | Neuer Fund (tote/disabled Glieder + Status-Drift) |

---

### F-127 · T-L06 · ❌ Fehlgeschlagen · Wichtig

| Feld | Inhalt |
|---|---|
| Erwartet | Nach Annahme: Bearbeiten/Löschen blockiert bzw. deaktiviert-mit-Grund; Auftrag konsistent |
| Beobachtet | `angebotDarfImWizardBearbeitetWerden` erlaubt u. a. **`kunde_akzeptiert`**. Detail-CTA `kannBearbeiten` enger (nur entwurf/gesendet/abgelaufen) + Toast „kann nicht mehr bearbeitet werden“. Löschen: `deleteAngebot` blockiert bei existierendem Auftrag, **nicht** allein wegen Annahme. **Kein** Reason-String „deaktiviert-mit-Grund“. Live kein angenommenes Angebot (Etappe-5-Löschung). |
| Einordnung | Neuer Fund (Wizard-Whitelist vs. Soll) |

---

## Robustheit

### F-128 · T-R01 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Erwartet | Doppelklick Absenden → genau eine Anfrage |
| Beobachtet | Code `PortalFunnelHost`: `busy`/`nextDisabled`, aber `submit()` ohne frühen `if (busy) return` → Race möglich. **Etappe 3:** zwei ZZTEST-Leads innerhalb ~1 Min (Doppel-Submit). Live Doppelklick in Etappe 6 nicht wiederholt. |
| Einordnung | Neuer Fund (Race) · Nachweis Etappe 3 |

---

### F-129 · T-R02 · ⚠️ Teilweise (Code) · —

| Feld | Inhalt |
|---|---|
| Erwartet | Doppelklick Erstellen/Senden → ein Dokument |
| Beobachtet | `AngebotWizard` / `RechnungWizard`: `saving` + early return + disabled. Live Doppelklick nicht (Mail-STOPP / kein Wizard-Durchlauf). |
| Einordnung | Teil · Code spricht für Schutz |

---

### F-130 · T-R03 · ✅ Bestanden · —

| Feld | Inhalt |
|---|---|
| Screenshot | `T-R03-notiz-xss.png` |
| Erwartet | Lange Texte/Emojis/Script ohne Layoutbruch; kein XSS |
| Beobachtet | Notiz gespeichert: `ZZTEST-XSS <script>alert(1)</script> …` erscheint als Text **ohne** Script-Ausführung (React-Text; Tags nicht als HTML). Emoji/Anführungszeichen/`&` ok. 5000+ Zeichen und PDF/Portal-Anzeige dieser Notiz nicht geprüft. Mail/PDF-Templates nutzen `escapeHtml`/`esc`. |
| Einordnung | Akzeptiertes Ist für Notiz-UI |

---

### F-131 · T-R04 · ⚠️ Teilweise (Code) · —

| Feld | Inhalt |
|---|---|
| Erwartet | Große/falsche/0-Byte-Dateien → verständliche Fehler; danach gültiges Foto ok |
| Beobachtet | Client `PhotoUpload.tsx`: max **10 MB**/Datei, 30 MB gesamt, Accept image/video/pdf/doc. Server `meldung-storage.ts`: Foto max **8 MB** (jpeg/png/webp/heic). Client/Server-Limit **abweichend**. Live Upload .exe/.svg/0-Byte/>15 MB nicht ausgeführt. |
| Einordnung | Teil · Limit-Mismatch = potenzieller Fund |

---

### F-132 · T-R05 · ❌ Fehlgeschlagen · Wichtig

| Feld | Inhalt |
|---|---|
| Erwartet | Dirty-Check „Änderungen verwerfen?“ / kein stiller Datenverlust |
| Beobachtet | `AngebotWizard`: `draftDirty` + Close → Silent-Save; `DocumentCanvas` `manageHistory={false}` — **kein** `beforeunload`. Browser-Zurück/Reload ohne Leitfaden-Confirm. Live Schritt-3 nicht durchgespielt; Code-Befund klar. |
| Einordnung | Neuer Fund |

---

### F-133 · T-R06 · ✅ Bestanden · —

| Feld | Inhalt |
|---|---|
| Screenshot | `T-L04-wartung-empty.png` |
| Erwartet | Gestaltete Empty-States, kein Spinner-für-immer |
| Beobachtet | Wartung-Filter: Icon + „Keine Vorgänge“ + Hinweis Filter. Code: `MockEmpty` CRM-Listen; Portal `PortalEmptyState`/`PortalStateView`. Frische ZZTEST-HV ohne Objekte / Partner ohne Aufträge nicht separat neu angelegt — Empty an bestehendem Filter belegt. |
| Einordnung | Akzeptiertes Ist |

---

### F-134 · T-R07 · ⚠️ Teilweise · —

| Feld | Inhalt |
|---|---|
| Erwartet | Suche/Sort/Mehrfach/CSV/Pull-to-Refresh; CSV Umlaute; Löschen mit Confirm |
| Beobachtet | Liste: Sort-Pfeile, Checkboxen, Suche, CSV-Button geklickt (Download in Automation nicht verifiziert). Code `useExport.ts`: UTF-8 **BOM** `\uFEFF`, Trenner `;` → Excel-Umlaute ok. Bulk-Löschen: `MockModal`-Confirm. Mobile Pull-to-Refresh nicht getestet. |
| Einordnung | Teil |

---

### F-135 · T-R08 · ⚠️ Teilweise (Code) · —

| Feld | Inhalt |
|---|---|
| Erwartet | Cookie weg → sauberer Login-Redirect, kein Error-Kaskade |
| Beobachtet | Code: Dashboard-Layout `redirect('/login')`; Client `SessionGuard` → Modal + `/login?error=session|idle`. Live Cookie-Löschen mitten in Arbeit **nicht** ausgeführt (CRM-Session erhalten). |
| Einordnung | Teil · Code |

---

### F-136 · T-R09 · ✅ Bestanden (Befund dokumentiert) · —

| Feld | Inhalt |
|---|---|
| Screenshot | `T-R09-portal-login-fehler.png` |
| Erwartet | Verständliche Fehlermeldung; Rate-Limit/Lockout dokumentieren |
| Beobachtet | Mehrfach Falschpasswort (`hv-nord@example.test` / `WrongPass!…`): Meldung **„E-Mail oder Passwort ist ungültig.“** Nach ≥2 Versuchen **keine** Lockout-/Rate-Limit-Meldung. Code: `signInWithPassword` ohne App-Lockout; OTP-Funnel hat separat `FUNNEL_OTP_MAX_ATTEMPTS=5`. |
| Einordnung | Befund für Berater · keine Wertung |

---

## Funde — Übersicht (Neu / Wichtig+)

| ID | Kurz | Schwere |
|---|---|---|
| F-122 | Auftrag-an-HW ohne Org-Freigabe-Gate | Blocker |
| F-123 | Freigabe bleibt nach Preiserhöhung (Q6 Freeze) | Wichtig |
| F-126 | Projekt-Kette disabled / Status-Drift Lead vs. Entitäten | Wichtig |
| F-127 | Angenommenes Angebot im Wizard-Gate weiter bearbeitbar | Wichtig |
| F-128 | Melde-Submit Race / Doppel-Anfrage | Wichtig |
| F-132 | Kein Dirty-Check/beforeunload Angebot-Wizard | Wichtig |
| F-131 | Foto-Limit Client 10 MB vs Server 8 MB | Kosmetik/Wichtig |

---

## Für den Datenschutzberater / Security

| ID | Thema |
|---|---|
| F-136 | Portal-Passwort-Login: **kein** sichtbares Rate-Limit/Lockout nach mehreren Fehlversuchen (nur generische Ungültig-Meldung). OTP-Funnel limitiert separat. |
| F-130 | XSS-Probe in CRM-Notiz: Script **nicht** ausgeführt (React-Escaping). |

---

## ZZTEST / angelegt in Etappe 6

| Typ | Hinweis |
|---|---|
| Notiz | `ZZTEST-XSS …` an Lead `22eac221-…` Akte |

Keine weiteren ZZTEST-Kunden/Vorgänge angelegt (Mail-STOPP / Cascade-Risiko).

---

## Viewport

Desktop geprüft. Mobile 375 (Pull-to-Refresh T-R07) nicht separat.
