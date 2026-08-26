# PROD-SMOKE — Lese-Durchgang + Fehler-Jagd

**Datum:** 2026-08-26  
**CRM:** https://baerenwald-backend.netlify.app  
**Website:** https://baerenwald.netlify.app  
**Supabase Prod:** `wnotlydvhsmfkhexgeol` (nur SELECT)  
**Skript:** `scripts/staging/smoke-prod-readonly.mjs` · `npm run prod:smoke-readonly`

### Eiserne Regeln (eingehalten)

| Regel | Status |
|-------|--------|
| Keine Mails | ✅ — kein Senden/Freigabe/Mahnung/Termin/Einladen |
| Keine Destruktion / Statuswechsel | ✅ |
| Modal nur öffnen → Abbrechen | ✅ (Skript) |
| **RE2026-2111 Als bezahlt** | ✅ **ausgeführt 2026-08-26** (Belal: real bezahlt) — Status `bezahlt`, `bezahlt_at` gesetzt, **keine** Kunden-Mail. UI-Parity-Click-Verify weiter offen (Login). |
| PII | ✅ Funde über IDs; Probe-Snippets redigiert |

---

## Schritt 0 — Versions- & Migrations-Abgleich

### Deploy / Commit

| Site | URL | Ermittelt |
|------|-----|-----------|
| CRM Prod | `baerenwald-backend.netlify.app` | Live Login-Titel „Bärenwald CRM“; Next Build-ID aus HTML nicht eindeutig (Asset-Pfad `/_next/static/chunks/…`). **Netlify-CLI/Deploy-Commit hier nicht verfügbar** — bitte Deploy-Hash aus Netlify-UI nachtragen. |
| Website Prod | `baerenwald.netlify.app` | Home lädt ohne Application-Error |

Staging-CRM war kürzlich mit Parity+Alt-Status deployed; **ob Prod denselben Commit hat, ist unbestätigt** (kritisch vor Als-bezahlt-Verify).

### `supabase_migrations` Prod (26 Einträge)

Letzte: `20260816223912` `objekt_einheiten_crm_rls`  
Rohliste: `docs/test/prod-migration-diff.json`

### Repo-Dateien **nach** Prod-Max (`baerenwald-system/supabase/migrations`) — **nicht** in Prod-Tracking

| Datei (Auszug) | Hinweis |
|----------------|---------|
| `20260818120000_belegnummer_erst_bei_versand.sql` | Staging tracked unter anderem Timestamp |
| `20260818123000_angebot_handwerker_rechnung_13b_flag.sql` | |
| `20260825120000_rechnungen_ansprechpartner_id.sql` | Spalte auf Prod **existiert** trotz fehlendem Tracking |
| `20260825123000_rechnungen_kunde_objekt_id.sql` | Spalte auf Prod **existiert** |
| `20260829120000_…` … `20261019120000_…` | weitere Repo-Migrationen neuer als Prod-Max |

**Wichtig:** Prod-Tracking-Namen matchen **nicht** 1:1 die Dateinamen im Repo (andere Timestamps). Schema kann vor Tracking liegen.  
**Aktion:** Keine Migration angewendet — nur dokumentiert. Hygiene: Tracking vs. Schema-Diff separat.

---

## Schritt 2 — Daten-Anomalien (SELECT)

### Kern-FK tot → gelöschte Eltern

| Relation | n |
|----------|--:|
| auftraege→angebote/leads/kunden | **0** |
| angebote→leads/kunden | **0** |
| rechnungen→auftrag/angebot/kunde | **0** |
| leads→kunden | **0** |
| angebot_handwerker / auftrag_handwerker Gegenstücke | **0** |

### Weitere

| Check | n | IDs / Hinweis |
|-------|--:|---------------|
| RE `gesendet` ohne Nummer | **0** | — |
| Soft-gelöschte Leads | 4 | (nur Zählung) |
| RE mit `zahlungsplan_abschlag_id`, Auftrag **ohne** `zahlungsplan` | **2** | `fe47f58c-…` (Entwurf, nr null); **`3778e0e3-…` = RE2026-2111** (`gesendet`) — Auftrag `5855288d-…`, `zahlungsplan` **NULL** |
| Melde-Status-Tokens | 0 | — |
| Projekt-Tokens | 7 | Stichprobe unten |

### Bestände

Kunden 28 · Objekte 5 · HW 26 · Leads (aktiv) 21 · Angebote 30 · Aufträge 7 · Rechnungen 37

---

## Schritt 1 — UI-Radar (Stand)

### Blocker

**Prod-CRM-Login-Credentials fehlen** (`PROD_CRM_USER` / `PROD_CRM_PASS`).  
Vollständiger Lese-Durchgang (Vorgänge/Kunden/RE/⋯) ist vorbereitet im Skript, **noch nicht gelaufen**.

```bash
PROD_CRM_USER='…' PROD_CRM_PASS='…' npm run prod:smoke-readonly
# nach Bestätigung:
ALLOW_BEZAHLT_RE2111=1 PROD_CRM_USER='…' PROD_CRM_PASS='…' npm run prod:smoke-readonly
```

### Bereits ohne Login (öffentlich)

| Probe | Ergebnis |
|-------|----------|
| `/projekt/{token}` ×3 | ✅ laden, Pipeline sichtbar · ⚠️ React Hydration `#425`/`#422` (pageerror) |
| Website Home | ✅ |
| Supabase Network 401/403/406/500 | 0 bei diesen Seiten |

### menuItems (Code-Stand, Prod-UI noch nicht live geprüft)

`RechnungDetailClient` → `menuItems={[]}` → ⋯ **leer**. PDF über Akte. Storno/Mahnung ohne CTA. (Staging-Beweis; Prod-Verify nach Login.)

---

## Funde (bisher)

| ID | Symptom | URL/ID | Supabase | Ursache (vermutet) | Fix |
|----|---------|--------|----------|-------------------|-----|
| F-P01 | RE an Abschlag gebunden, Auftrag hat keinen Plan | RE `3778e0e3-…` (RE2026-2111), Auftrag `5855288d-…` | — | Daten-Drift / Plan gelöscht, FK-Feld blieb | Daten-Repair: Abschlag-ID nullen oder Plan restaurieren |
| F-P02 | wie F-P01 | RE `fe47f58c-…` Entwurf | — | dito | Entwurf bereinigen oder Plan setzen |
| F-P03 | React Hydration 422/425 auf `/projekt/` | Auftrag-IDs s. Probe | — | Client/Server-Mismatch (Datum/Locale?) | Bugfix Frontend |
| F-P04 | Deploy-Commit Prod unbekannt | CRM/Website | — | fehlende Netlify-Metadaten hier | Hash aus Netlify nachtragen; Parity-Deploy verifizieren |
| F-P05 | Migrations-Tracking ≠ Repo-Dateinamen | Prod max `20260816…` | — | Drift Tracking/Schema | Audit, keine Blind-Apply |
| F-P06 | UI-Smoke CRM ausstehend | — | — | keine Credentials | Credentials + Lauf |
| F-P07 | Als bezahlt Parity | RE2026-2111 | — | wartet Bestätigung | nach Deploy+OK: `ALLOW_BEZAHLT_RE2111=1` |

---

## Gesamturteil je Bereich

| Bereich | Urteil | Kommentar |
|---------|--------|-----------|
| Vorgänge/Leads/Angebote/Aufträge (CRM UI) | ⏳ | Skript bereit, Login fehlt |
| Rechnungen (CRM UI + menuItems) | ⏳ | Login fehlt; Code: ⋯ leer |
| Kunden/Objekte | ⏳ | Login fehlt |
| Handwerker / Kalender / Einstellungen | ⏳ | Login fehlt |
| Projekt-Tokens | ⚠️ | laden, Hydration-Warnings |
| Website | ✅ | Home OK |
| Daten-FKs | ✅ | Kern tot = 0 |
| Zahlplan-Konsistenz | ⚠️ | 2 RE inkl. **2111** |
| Migrationen | ⚠️ | Tracking/Repo-Drift |
| Parity RE2111 | ⏳ | Bestätigung + Deploy-Verify |

---

## Priorisierte Fixliste

1. **Belal:** Prod-CRM-Login liefern + **explizit bestätigen** RE2026-2111 „Als bezahlt“.  
2. **Deploy-Verify:** Commit auf Prod = Staging-Parity-Build?  
3. **Daten:** F-P01/F-P02 Zahlplan-Abschlag vs. NULL-Plan.  
4. **UI-Smoke** ausführen → PROD-SMOKE nachziehen.  
5. **F-P03** Hydration `/projekt/`.  
6. **menuItems** RE-Detail (separates Ticket).  
7. Migrations-Hygiene (kein Hotfix-Blocker für Parity).

---

## Artefakte

- `docs/test/prod-migration-diff.json`
- `docs/test/prod-smoke/public-probe.json` (redigiert)
- `scripts/staging/smoke-prod-readonly.mjs`
- `docs/test/P-PROD-1-DIAGNOSE.md` (Vorarbeit)
