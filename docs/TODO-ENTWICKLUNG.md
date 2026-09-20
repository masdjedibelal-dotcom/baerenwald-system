# To-do Entwicklung (Audit) — Status aus audit-status.mjs

Stand: 2026-09-19 · Repo: baerenwald-system

**Regel:** Erledigt nur, wenn `node scripts/audit-status.mjs` ✅ meldet. Analyse-Docs zählen nicht.

Belal-Blocker (kein Code): `docs/AUDIT-BLOCKER.md` (M1–M8).
Offene Entscheidungen: `docs/OFFENE-FRAGEN.md`.

## Kennzahlen (Ist)

| Kennzahl | Ist |
|----------|-----|
| `withCrmReadFallback_files` | 0 |
| `revalidatePath` | 25 |
| `router_refresh` | 11 |
| `force_dynamic` | 36 |
| `css_kb` | 427 |
| `supabase_no_error_heuristic` | 36 |
| `logDbError_calls` | 1526 |
| `silent_catch` | 0 |
| `void_notify` | 0 |
| `void_mail_notify_push` | 0 |
| `void_outside_allowlist` | 0 |
| `handwerker_display` | 5 |
| `status_update_outside_lib` | 0 |
| `force_dynamic_off_allowlist` | 0 |
| `old_menus` | 0 |
| `animate_spin_outside_loading` | 0 |
| `class_card_outside_mockcard` | 0 |
| `locale_format_outside_helpers` | 0 |
| `modal_import_files` | 0 |
| `mockmodal_import_files` | 0 |
| `modal_tsx_exists` | false |
| `mockmodal_tsx_exists` | false |
| `button_import_files` | 0 |
| `button_tsx_exists` | false |
| `field_alias_exists` | false |
| `input_tsx_exists` | false |
| `raw_button` | 31 |
| `raw_input` | 98 |
| `raw_select` | 1 |
| `raw_textarea` | 1 |
| `raw_button_off_allowlist` | 5 |
| `raw_field_off_allowlist` | 0 |
| `status_badge_variants` | 0 |
| `menu_variants` | 35 |
| `animate_spin` | 3 |
| `class_card_token` | 0 |
| `card_class` | 0 |
| `freie_leertexte` | 0 |
| `toLocaleDateString` | 0 |
| `toLocaleString_de` | 8 |
| `tw_std_colors` | 0 |
| `hex_in_class` | 0 |
| `style_jsx` | 607 |
| `copy_imports` | 9 |
| `snake_in_ui_heuristic` | 5 |
| `files_over_1000` | 29 |
| `eslint` | true |
| `ci` | true |
| `sentry_pkg` | true |
| `gitignore` | true |
| `audit_status` | true |
| `pattern_katalog` | false |
| `confirm_popup` | true |
| `confirm_delete_action_calls` | 0 |
| `confirm_helpers_exist` | false |
| `ignore_during_builds_false` | true |
| `shared_domain_byte_ok` | true |
| `resolver_diff_lines` | 0 |
| `mockbtn` | 284 |
| `mockfield` | 103 |
| `editorsheet` | 135 |
| `verlauf_panel` | 2 |
| `status_vokabular` | true |
| `sync_shared` | true |
| `demo_banner_settings` | 1 |

## To-dos

| ID | Status | Titel | Ziel / Ist |
|----|--------|-------|------------|
| P0-1 | erledigt | Mail-Catch / Staging-Guards | Baseline Belal |
| P0-2 | erledigt | Ungenutzte Komponenten gelöscht (Baseline) | Baseline Belal |
| P0-3 | erledigt | Parität / Shared-Baseline | Baseline Belal |
| P0-4 | erledigt | Guards / kritische Dateien | Baseline Belal |
| P0-5 | erledigt | .env.example / Secrets-Doku | Baseline Belal |
| P0-6 | offen | Branch-Schutz (Belal M3) | Belal: GitHub Branch-Schutz staging→main |
| P1-1 | erledigt | Perf-Baseline Staging | docs/perf-baseline.md mit Messwerten |
| P1-2 | offen | Netlify-Region = Prod-Supabase (Belal M1) | Belal: Region eu-west-1 (Prod) |
| P1-3 | erledigt | Sentry-Code (@sentry/nextjs, ohne DSN inaktiv) | @sentry/nextjs installiert + Instrumentation |
| P1-4 | offen | Next 15 (Belal M6) | next@15 (Belal-Abnahme) |
| P1-5 | erledigt | Service-Role Gates | scripts/check-service-role-gate.mjs + 0 Verstöße |
| P1-6 | erledigt | Import-/Critical-Guards | Baseline Belal |
| P1-7 | erledigt | Mock-Primitives-Guard | Baseline Belal |
| P2-1 | erledigt | Resolver-Abgleich dokumentiert | Abweichungstabelle ohne Logik-Änderung |
| P2-2 | erledigt | status-vokabular vollständig | src/lib/.../status-vokabular.ts |
| P2-3 | erledigt | Shared-Domain-Weg = E4 Hybrid | docs/P2-3-shared-domain.md = E4 freigegeben |
| P2-4 | erledigt | Sync-Skript + Byte-Parität + Resolver | sync --check OK + resolver_diff=0 (ist 0) |
| P2-5 | erledigt | Status-Writes nur write-* | direkte .update({ status }) außerhalb lib/status=0 (ist 0) |
| P2-6 | erledigt | Vertrags-Tests Status | Tests HV-Freigabe/Partner/Abnahme/RE/Storno |
| P2-7 | erledigt | Mail/Notify Sync oder markiert | Inventur + Sync oder app-spezifisch |
| P2-8 | erledigt | Lib-Kopien abgearbeitet | 0 offene DRIFT in P2-8-Liste |
| P3-1 | erledigt | Index-Migration (Staging-Datei) | Gezielte Index-Migration nachgewiesen + Staging angewandt (Prod=Belal M5) |
| P3-2 | erledigt | RLS-Rekursion weg + withCrmReadFallback=0 | withCrmReadFallback_files=0 (ist 0) |
| P3-3 | erledigt | Vorgangsliste RPC + echte Paginierung | crm_vorgaenge_lead_page ohne Hard-Limit 200 |
| P3-4 | erledigt | revalidatePath gezielt / refresh-Duplikate weg | revalidatePath<250 · router.refresh<30 (ist 25/11) |
| P3-5 | erledigt | force-dynamic / unstable_cache Stammdaten | force-dynamic nur Allowlist-Doc (off=0) |
| P3-6 | offen | CSS < 150 KB | css_kb<150 (ist 427) |
| P3-7 | erledigt | CRM-Sheets Skeleton | Skeleton statt Ladetext in Sheets |
| P4-1 | erledigt | logDbError an allen Reads | logDbError flächig (calls=1526, no_error≈36; Ziel <50 nach Heuristik-Fix bewusst-ignoriert) |
| P4-2 | erledigt | Stille catches geloggt | silent_catch=0 (ist 0) |
| P4-3 | erledigt | Mail/Notify → email_log Ergebnis | void Mail/Notify/Push=0 · void außerhalb Allowlist=0 (ist 0/0) + email_log gesendet|fehler |
| P4-4 | erledigt | Error-Boundaries flächig | error.tsx / Boundaries an Kernrouten |
| P4-5 | erledigt | Vorgangsliste Limit-Hinweis | Hinweis „X von Y Vorgängen angezeigt“ |
| P4-6 | offen | Geld ??0 / null-sicher | null-sichere Beträge in UI |
| P5-1 | erledigt | Pattern-Katalog Entscheidungen | Baseline Belal |
| P5-2 | erledigt | Confirm nur ConfirmPopup (E1) | confirmDelete/confirmAction=0, Helfer weg (ist calls=0) |
| P5-3 | erledigt | Overlays nur EditorSheet; Modal/MockModal gelöscht | Modal/MockModal Dateien=0 Imports=0 (modal_files=0, mock=0) |
| P5-4 | offen | Buttons nur MockBtn; Button.tsx weg (E2) | Button.tsx weg; Imports=0; raw_button außerhalb Allowlist=0 (ist 5; total=31) |
| P5-5 | erledigt | Felder nur MockField (E3) | Field-Alias weg; raw input/select/textarea außerhalb Allowlist=0 (ist 0) |
| P5-6 | erledigt | Nur StatusBadge | Sonderbadges=0 (ist 0) |
| P5-7 | erledigt | Nur MockEntityRowMenu | alte Menüs=0 (ist 0) |
| P5-8 | erledigt | Laden/Leer Crm* + MockEmpty; EmptyState weg | animate-spin außerhalb Lade-Komponente=0 (ist 0) |
| P5-9 | erledigt | Klasse card → MockCard | class card außerhalb MockCard=0 (ist 0) |
| P5-10 | erledigt | Detail-Layout-Standard (Baseline) | Baseline Belal |
| P5-11 | erledigt | Timeline nur VerlaufPanel | VerlaufPanel kanonisch; Legacy-timeline weg |
| P5-12 | erledigt | Datum/Geld eine Format-API | toLocaleString('de)/Intl.NumberFormat außerhalb Format=0 (ist 0); toLocaleDateString=0 |
| P5-13 | erledigt | Farben nur Tokens | tw_std=0 hex_class=0 (ist 0/0) |
| P5-14 | offen | Copy-Quelle lib/copy (E5/E6) | Handwerker in Anzeigetexten=0 außer „Fachfirma beauftragen“ (ist 5) |
| P5-15 | erledigt | Screen-Contracts | Screen-Contracts dokumentiert+eingehalten |
| P5-16 | erledigt | EditorSheet-Footer + Verben + Menüs | sheet_footer_custom=0 · footer_komponenten=0 · verb_uebernehmen=0 · menue_varianten=0 |
| P5-17 | erledigt | Checkbox/Date/Segment/Tabs | raw_checkbox=0 raw_date=0 segment_varianten=1 role_tab_ausserhalb_MockTabs=0 |
| P5-18 | erledigt | Listen/Table/Filter/Card/Detail/Empty | raw_table=0 filter=0 card_class=0 detail_rahmen=1 freie_leertexte=0 |
| P5-E8a | erledigt | Demo-Banner nur Einstellungen | Banner „Transaktionsdaten leeren“ nur Einstellungen |
| P7-4 | erledigt | Generated types Staging | supabase gen types (Staging) |
| P7-5 | erledigt | ESLint ignoreDuringBuilds false | ESLint aktiv + ignoreDuringBuilds: false |
| P7-6 | erledigt | CI auf staging | .github/workflows Build+Guards+audit-status |
| P7-7 | erledigt | Security-/Kernjourney-Tests | tc-08 + Kernjourneys ohne Skip-Ketten |
| P7-9 | erledigt | knip + remove-deploy-blockers obsolet | remove-deploy-blockers.mjs entfernt |
| P7-10 | offen | Dateien >1000 Zeilen teilen | files>1000 <5 (ist 29) |
| P7-11 | erledigt | Doku archiviert | docs/archiv + Leitdokumente |
| P7-1 | erledigt | Baseline-Migration vorbereitet | Datei+Anleitung, nicht anwenden |
| META-gitignore | erledigt | .gitignore vorhanden | .gitignore Root |
| META-audit-status | erledigt | audit-status.mjs | scripts/audit-status.mjs |

## Summe

- erledigt: **55**
- teilweise: **0**
- offen: **8**
- total: **63**

## R2 (2026-09-21) — Inline remrem + Card-Text

- 51 Inline-Werte in 21 CRM-Dateien repariert (`remrem` → 0).
- Guard `scripts/check-inline-css-werte.mjs` in CRM + Portal Build.
- MockBtn-Karten (doctype/Neu/Pos-Add/KPI): `height:auto` + `white-space:normal` gegen `.btn` 32px/nowrap.
- PosTable-Checkbox: nur Rahmenwert korrigiert (kein MockCheckbox — visuelle Select-Box in DnD-Zeile).

