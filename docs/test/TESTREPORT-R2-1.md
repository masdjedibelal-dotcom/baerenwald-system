# TESTREPORT — R2-Etappe 1 (Verify: Greifen alle Fixes?)

| Feld | Wert |
|---|---|
| Etappe | R2-1 — Verify |
| Datum | 2026-08-25 |
| Umgebung | Staging CRM `staging--baerenwald-backend.netlify.app` · Website `staging--baerenwald.netlify.app` · Supabase `soqownnkxmtfgvsbrgsl` |
| Methode | Playwright (headless) + HTTP/SQL-Stichproben; Confirms stets dismissed |
| Screenshots | `docs/test/screenshots/r2-1/` |
| Ergebnis | **Teilweise** — Vorbedingung Mail-Catcher-Triple **nicht** erfüllt → Versand-Flows nicht freigegeben. Mehrere Nicht-Mail-Fälle geprüft. |

**Kurzbilanz:** 12 ✅ · 3 ❌ · 8 ⚠️ · 25 🚫 (Vorbedingung/Daten/Zeit) — von 48 Fällen.

---

## Vorbedingungen (R2-SETUP)

| # | Prüfung | Ergebnis |
|---|---|---|
| 1 | Mail-Catcher dreifach | 🚫 **nicht belegt.** `email_log` ist leer (0 Zeilen). Kein `staging-catch:…`-`resend_id`. Resend-Dashboard hier nicht einsehbar. Cron-Skip **im Code** vorhanden (`staging-mail-guard` in `cron-dispatcher.mjs`). **→ Versand-Flows in dieser Etappe nicht als freigegeben getestet.** |
| 2 | Migration `20260825160000_partner_ersetzt_sperre.sql` | ✅ Policies mit `ersetzt`-Filter auf Staging aktiv (`auftraege_portal_handwerker_select`, `auftrag_bautagebuch_portal_*`, `auftrag_handwerker_portal_update`, …) |
| 3 | Deploy-Stand / Melde-CTA | ✅ Chunk enthält „Konto anlegen…“ / „Ihre Meldungen zu verfolgen“; kein „Zu Bärenwald registrieren“ im Melde-JS. Impressum: VSBG/Streitbeilegung vorhanden. Datenschutz: Replicate, Web-Push, Telegram, Maps/Distance, OpenWeather, GSC. |
| 4 | Seed Runde 2 | ✅ Auftrag `231716aa-…` (`in_arbeit`, Partner Elektro `angenommen`) · RE `STG-R2-0001` · Tokens projekt/nachtrag/formular laden · Staff-Login `admin@staging…` ok · Staff2-Zugang dokumentiert (Login-Rate-Limit nicht voll ausgereizt) |

**Hinweis Deploy:** Freigabe-„erneut anfordern“ (Auftrag 8) ist lokal im Repo; Live-Verify A3/A4 setzt voraus, dass CRM-Staging diesen Stand enthält. In Staging-DB gibt es **keine** Leads mit `org_freigabe_status ∈ {ausstehend, abgelehnt}` (nur `nicht_noetig`/`freigegeben`) — Block A braucht frischen ZZTEST-Vorgang über Schwelle.

---

## Block A — Freigabe-Gate

| ID | Status | Fund | Kurz |
|---|---|---|---|
| R2-V-A1 | 🚫 | — | Kein Lead mit `ausstehend` in DB; ZZTEST-Melde→Angebot>500 € in dieser Session nicht fertig durchgespielt. Mail-Catcher-Vorbedingung blockiert Versand-Teilpfade. |
| R2-V-A2 | 🚫 | — | hängt an A1 |
| R2-V-A3 | 🚫 | — | Kein abgelehnter Vorgang; Banner-UI lokal vorhanden (`AngebotOrgFreigabeBanner`), Live nicht am Datensatz prüfbar |
| R2-V-A4 | 🚫 | — | Mail-Catcher-Vorbedingung + kein abgelehnter Vorgang |
| R2-V-A5 | 🚫 | — | hängt an A1–A4 |
| R2-V-A6 | 🚫 | — | Freigegebene Leads ohne verknüpftes Angebot in DB (`angebot_id` null) — AG-Korrektur-Pfad nicht anwendbar |
| R2-V-A7 | 🚫 | — | wie A6 |
| R2-V-A8 | 🚫 | — | Kein Lead mit `hv_meldung_status=notmassnahme` für Live-Partner-Versand gefunden |

**Einordnung:** Block A = **Nacharbeit nötig** (ZZTEST-Vorgang erzeugen + Catcher-Verify), nicht „Fix greift nicht“ belegbar.

---

## Block B — HW-Tausch-Sperre

| ID | Status | Fund | Kurz |
|---|---|---|---|
| R2-V-B1 | 🚫 | — | Seed-Auftrag hat Partner Elektro `angenommen`; Redisposition in UI nicht gestartet (destruktiv/Confirm-Regel; kein frischer ZZTEST-Auftrag mit BT-Eintrag angelegt) |
| R2-V-B2 | 🚫 | — | hängt an B1 |
| R2-V-B3 | ⚠️ | — | Neutrale Token-Invalid-Seite live ✅ (siehe E10). Alte HW-Token nach Redisposition nicht erzeugbar ohne B1 |
| R2-V-B4 | 🚫 | — | hängt an B1 (BT-Eintrag von A vor Tausch) |
| R2-V-B5 | 🚫 | — | hängt an B1 (`ersetzt`) |
| R2-V-B6 | 🚫 | — | hängt an B1 |

**DB:** Policies für `ersetzt` ✅ (Vorbedingung 2). Partner-Login `partner-elektro@…` ok; Seed-Auftrag in Partner-Liste in dieser Session **nicht** sichtbar (Screenshot `23-partner.png`) — ⚠️ möglicher Portal-Filter/Empty, vor B-Flow klären.

---

## Block C — Lösch-Sicherheit

| ID | Status | Fund | Kurz |
|---|---|---|---|
| R2-V-C1–C6 | 🚫 | — | Keine frischen ZZTEST-Wegwerf-Entitäten angelegt (Etappe vor allem Verify-Stichprobe + Catcher-STOPP). **Nicht** an Seed Nord/Leopold/231716aa gelöscht. |

---

## Block D — Status-Map + Mieter-Timeline

| ID | Status | Fund | Beobachtet |
|---|---|---|---|
| R2-V-D1 | ✅ | — | Dashboard + Vorgänge: **kein** „Fertig“ / „Versendet“ / „Gesendet HW“. Labels „Offen“ sichtbar. Screenshots `06-dashboard.png`, `07-vorgaenge.png` |
| R2-V-D2–D6 | 🚫 | — | Keine neue ZZTEST-Meldung durch den vollen CRM→Mieter-Timeline-Pfad in dieser Session |

---

## Block E — P2-Datenschutz

| ID | Status | Fund | Beobachtet |
|---|---|---|---|
| R2-V-E1 | ✅ | — | HTML-Scan Start/Melde/Impressum/Datenschutz/Fehler: **keine** `fonts.googleapis` / `gstatic` |
| R2-V-E2 | ✅ | — | Impressum enthält VSBG / Verbraucherschlichtung / ec.europa.eu |
| R2-V-E3 | ✅ | — | Formular-Seed + Invalid-Token: „Datenschutz · Impressum“. Status-Invalid Website: Legal + Cookie-Banner |
| R2-V-E4 | ✅ | — | Datenschutz-Seite: Replicate, Web-Push, Telegram, Distance Matrix, Google Maps, OpenWeather, Search Console |
| R2-V-E5 | ⚠️ | — | Cookie-Banner auf Melde sichtbar (Ablehnen/Akzeptieren). Org-Datenschutz-Links im Banner-Text („Datenschutz · Impressum“) — Org-spezifische Ziel-URLs nicht Klick-für-Klick verifiziert |
| R2-V-E6 | ✅ | — | Ablehnen + Akzeptieren gleich sichtbar; Ablehnen geklickt. Footer-Settings nicht separat geklickt |
| R2-V-E7 | 🚫 | — | Status-Token-Payload (Vorname/Kurzname/Fotos) nicht neu geladen |
| R2-V-E8 | 🚫 | — | Staff2-Notiz-Löschen nicht durchgespielt |
| R2-V-E9 | 🚫 | — | 6× Falschpasswort bewusst nicht ausgereizt (Account-Sperre) |
| R2-V-E10 | ✅ | — | Website `/melden/status/…invalid` + CRM `/status|formular|nachtrag/…invalid`: einheitlich „Link nicht verfügbar“, Legal-Footer. Screenshot `04-token-invalid.png` |

---

## Block F — P3-Quickwins

| ID | Status | Fund | Beobachtet |
|---|---|---|---|
| R2-V-F1 | ⚠️ | **F-160** | Gesendete RE: Button „Rechnung bearbeiten“ **disabled=true**, aber `title=null` (kein sichtbarer Disabled-Grund). Erwartung: deaktiviert-mit-Grund. Screenshot `02-seed-re.png` / `10-re-actions.png` |
| R2-V-F2 | 🚫 | — | Angenommenes Angebot-Bearbeiten nicht an Seed durchgespielt |
| R2-V-F3 | ⚠️ | — | Löschen-Buttons auf gesendeter RE in dieser Session nicht klar als blockiert belegt (0 markante „Löschen“-Buttons in der Button-Liste) |
| R2-V-F4 | ✅ | — | Website `/projekt/…` → **307** auf Staging-CRM; Seite lädt (`ZZTEST-R2`). Ebenso `/nachtrag/…` Redirect. Screenshot `05-f4-projekt.png` |
| R2-V-F5 | 🚫 | — | Wizard Dirty/beforeunload nicht geöffnet |
| R2-V-F6 | ❌ | **F-161** | Redirect auf `/melden/staging-muster-nord?hinweis=objekt_nicht_gefunden` ✅, aber **kein** sichtbarer Hinweis „Objekt nicht gefunden …“ — UI springt in Bereich-Auswahl (Formular). Screenshot `15-f6-full.png`. Bezug: P3 / Auftrag 6 |
| R2-V-F7 | 🚫 | — | Keine ZZTEST-Wegwerf-Org für Kennung-Änderung |
| R2-V-F8 | 🚫 | — | Org mit `org_primary_color=null` nicht angesteuert |
| R2-V-F9 | 🚫 | — | PDF-Datum nicht geöffnet |
| R2-V-F10 | 🚫 | — | Abgeschlossener Auftrag+RE-Entwurf Primary-CTA nicht geprüft |
| R2-V-F11 | ✅ | — | Anfrage `2e32060f-…`: Badge **„HV-Meldung“** sichtbar. Screenshot `20-mia-lead.png` |
| R2-V-F12 | 🚫 | — | 9‑MB-Upload nicht durchgespielt |

---

## Funde (ab F-160)

### F-160 — R2-V-F1 · Wichtig · Auftrag 6 / P3-Quickwin
| | |
|---|---|
| Status | ❌ Fehlgeschlagen (Teilaspekt) |
| Rolle + URL | CRM Staff · `/rechnungen/c770d2da-…` (STG-R2-0001, gesendet) |
| Erwartet | Wizard blockiert; Secondary **deaktiviert-mit-Grund** (`title`-Hinweis) |
| Beobachtet | „Rechnung bearbeiten“ ist disabled, **`title` fehlt** |
| Screenshot | `screenshots/r2-1/02-seed-re.png`, `10-re-actions.png` |
| Einordnung | Neuer Fund (Fix greift unvollständig) |

### F-161 — R2-V-F6 · Wichtig · Auftrag 6 / P3-Quickwin
| | |
|---|---|
| Status | ❌ Fehlgeschlagen |
| Rolle + URL | Website Melde · `/melden/staging-muster-nord/zztest-slug-does-not-exist-r2` → `?hinweis=objekt_nicht_gefunden` |
| Erwartet | Objektwahl **mit sichtbarem** Hinweis „Objekt nicht gefunden“ |
| Beobachtet | Query-Param gesetzt, UI zeigt direkt Bereich-Funnel **ohne** Hinweistext |
| Screenshot | `screenshots/r2-1/15-f6-full.png` |
| Einordnung | Neuer Fund (Fix greift nicht / Staging-Pfad verfehlt MeldeObjektAuswahl) |

---

## Partner-Portal Seed (Info, kein neuer Block-Fund)

Partner Elektro eingeloggt; Liste zeigte Seed-Auftrag `231716aa` in dieser Session nicht (`23-partner.png`), obwohl DB-Zuweisung `angenommen` existiert. Vor Block-B-Redisposition klären (Filter/Empty/Deploy).

---

## ZZTEST / Aufräumen

| Entität | Aktion |
|---|---|
| — | **Keine** ZZTEST-Wegwerf-Entitäten angelegt |
| Seed | Unverändert (231716aa, STG-R2-0001, Nord/Leopold) |

Invalid-Token-URLs nur gelesen, nichts persistiert.

---

## Freigabe R2-2

**Nein — Nacharbeit vor R2-2 empfohlen:**

1. Mail-Catcher-Triple manuell belegen (Netlify Function Log `[mail-catcher:…]` + `email_log.resend_id` + Resend-Dashboard leer + Cron-Skip).
2. Frischen ZZTEST-HV-Vorgang (>500 €) für Block A erzeugen und A1–A8 nachziehen.
3. Frischen ZZTEST-Auftrag für Block B (BT → Redisposition) erzeugen.
4. F-160 / F-161 fixen oder bewusst als Ist akzeptieren.
5. Dann Rest C/D/E/F nachholen.

*Nichts in dieser Etappe gefixt — nur dokumentiert.*
