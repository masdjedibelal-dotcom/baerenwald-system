# Abschluss — Mega-Auftrag Audit (19.09.2026)

**Repos:** CRM `baerenwald-system` · Portal/Web `baerenwald`  
**Messung:** `node scripts/audit-status.mjs` in beiden Repos (Stand dieses Dokuments)

---

## Zahlen (audit-status)

### CRM (`baerenwald-system`)

| | |
|--|--|
| **Summe** | **53 erledigt** · 0 teilweise · **7 offen** · 60 total |
| `withCrmReadFallback_files` | 0 |
| `revalidatePath` | 25 |
| `router_refresh` | 11 |
| `force_dynamic` | 36 (off Allowlist: 0) |
| `css_kb` | 427 (Ziel &lt;150 offen) |
| `logDbError_calls` | 1497 |
| `supabase_no_error_heuristic` | 36 |
| `silent_catch` | 0 |
| `void_mail_notify_push` / `void_outside_allowlist` | 0 / 0 |
| `status_update_outside_lib` | 0 |
| `resolver_diff_lines` | 0 |
| `shared_domain_byte_ok` | true |
| `ignore_during_builds_false` | true |
| `raw_button_off_allowlist` | 0 |
| `handwerker_display` | 5 (P5-14) |
| `files_over_1000` | 29 (P7-10) |

**CRM offen:** P0-6 · P1-2 · P1-4 · P3-6 · P4-6 · P5-14 · P7-10

### Portal (`baerenwald`)

| | |
|--|--|
| **Summe** | **21 erledigt** · 0 teilweise · **1 offen** · 22 total |
| `portal_btn_on_button` | 0 |
| `foreign_tokens` | 0 |
| `in_kuerze` | 0 |
| `silent_catch` | 0 |
| `logDbError_calls` | 804 |
| `portal_sticky_actions` | 7 |
| `portal_action_menu` | 15 |
| `files_over_1000` | 21 (P7-10) |

**Portal offen:** P7-10

---

## Manuell für Belal (Reihenfolge zwingend)

### 1. Migrationen vom 19.09. auf **Prod** einspielen

Zuerst Staging bereits abgenommen; jetzt **Prod** (`wnotlydvhsmfkhexgeol`), in dieser Reihenfolge:

| # | Datei | Inhalt |
|---|--------|--------|
| 1 | `supabase/migrations/20260919133240_p3_2_fix_rls_recursion_helpers.sql` | RLS-Rekursion (SECURITY DEFINER Helpers) |
| 2 | `supabase/migrations/20260919140000_common_list_indexes.sql` | Listen-Indizes |
| 3 | `supabase/migrations/20260919133752_p3_3_crm_vorgaenge_lead_page_pagination.sql` | Vorgangs-RPC + echte Paginierung |

Nach Apply: kurze Smoke auf Prod (Login, Vorgänge, eine Anfrage).  
Details: `docs/BASELINE-MIGRATION.md` · Blocker **M5**.

### 2. DANACH Code hochladen

1. Offene Commits in **GitHub Desktop** auf Branch `staging` (CRM + Portal).
2. Staging-Deploy prüfen (CRM + Website/Portal).
3. Merge **staging → main** (erst wenn Branch-Schutz steht, siehe Punkt 3).
4. Prod-Deploy = derselbe Stand wie Staging — keine Hotfixes am Staging vorbei.

### 3. Rest-Blocker (nach Deploy / parallel möglich)

| Thema | Aktion | Blocker |
|--------|--------|---------|
| **Sentry-DSN** | DSN in Netlify Env (CRM + Portal); Code ist ohne DSN inaktiv | M2 |
| **Netlify-Region** | Functions → **eu-west-1** (Irland), nicht Frankfurt — an Prod-Supabase | M1 / P1-2 |
| **Branch-Schutz** | GitHub: `staging` → `main` schützen | M3 / P0-6 |
| **Next 15** | Major-Upgrade + Abnahme (kein 14.2-Patch) | M6 / P1-4 |
| **AVV Irland** | Vorlage: Hosting/DB-Region **Irland (eu-west-1)**, nicht Frankfurt | M7 |
| **`data/`-Bereinigung** | Kundendaten/Verträge aus Repo oder aus Versionierung | M8 — Liste in `docs/AUDIT-BLOCKER.md` |

Alte Branches aufräumen: **M4**.

---

## Noch Code (nicht Belal-Manuell)

| ID | Thema | Hinweis |
|----|--------|---------|
| P3-6 | CSS &lt;150 KB | raw 427 / gzip ~69; Entscheidung A/B/C in `OFFENE-FRAGEN.md` |
| P4-6 | Geld `??0` null-sicher | UI-Beträge |
| P5-14 | Handwerker→Partner Copy | 5 Anzeigetexte |
| P7-10 | Dateien &gt;1000 Zeilen | u. a. PortalFunnelHost, RechnungWizard, AngebotWizard, VorgaengeListeClient |

---

## Klick-Checkliste — lokaler Test (`npm run dev`)

### Vorbereitung

```bash
# Terminal 1 — CRM
cd ~/code/baerenwald-system && npm run dev
# → http://localhost:3000

# Terminal 2 — Portal/Website
cd ~/code/baerenwald && npm run dev
# → http://localhost:3000 (oder anderen Port falls belegt)
```

`.env.local` mit Staging-Supabase (nicht Prod). CRM-Login Staging-Admin siehe `docs/STAGING.md`.

### CRM (http://localhost:3000)

| # | Klick | Erwartung |
|---|--------|-----------|
| 1 | `/login` → Anmelden | Dashboard / Vorgänge ohne 500 |
| 2 | `/vorgaenge` | Liste lädt; Paginierung / „von Y“-Hinweis ok |
| 3 | Erste Zeile → Detail (Anfrage/Angebot/Auftrag) | DetailShell, StatusBadge, Tabs |
| 4 | `/anfragen` → eine Anfrage öffnen | Melder-Karte, Aktionen |
| 5 | Angebot öffnen → Wizard/Bearbeiten (falls Entwurf) | Wizard öffnet, Speichern bricht nicht |
| 6 | Auftrag → Tab Leistungen / Finanzen | Karten laden |
| 7 | `/rechnungen` → ggf. Wizard | Kein Crash |
| 8 | `/kunden` → Kunde | Vorgänge-Einbettung ok |
| 9 | `/handwerker` bzw. Partner-Liste | Liste + Detail |
| 10 | Header-Suche (⌘K / Command) | Treffer oder „Keine Treffer“ |
| 11 | Einstellungen → Firma / Profil | Speichern möglich |
| 12 | Sheet/Confirm (z. B. Löschen-Dialog) | ConfirmPopup, kein `window.confirm` |
| 13 | Browser-Konsole | keine roten Hook-/Chunk-Fehler |

### Portal / Website (baerenwald)

| # | Klick | Erwartung |
|---|--------|-----------|
| 1 | `/` Landing | Marke, CTA |
| 2 | `/rechner` und `/portal-tools/rechner` | dieselbe Rechner-UI |
| 3 | `/melden/…` (Staging-Objekt) | Funnel bis Danke/Status |
| 4 | `/portal` Login (HV) | Übersicht, Vorgänge, Sticky Actions |
| 5 | Vorgang öffnen | PortalFlowTimeline, StatusPill |
| 6 | `/partner` Login | Dashboard, Detail mit Aktionsleiste |
| 7 | Leere Inbox / Fehlerzustand | InboxEmpty / DetailError (kein Rohtext-Spinner) |
| 8 | Konsole | keine Token-/Import-Fehler |

### Kurz-Smoke nach Prod-Migration (Staging oder Prod-Read)

1. CRM Login → Vorgänge (RPC/Paginierung).  
2. Org-Portal: eigene Meldung sichtbar; fremde Org sieht nichts (TC-08-Idee).  
3. Partner: zugewiesener Auftrag sichtbar.

---

## Messung wiederholen

```bash
cd ~/code/baerenwald-system && node scripts/audit-status.mjs
cd ~/code/baerenwald && node scripts/audit-status.mjs
```

Versionierung: GitHub Desktop · Branch `staging`.
