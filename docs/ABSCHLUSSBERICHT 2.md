# Abschlussbericht — Autonomer Durchlauf Nr. 1–11

**Arbeitsrepo (kanonisch):** `/Users/belalmasdjedi/code/baerenwald-system`  
**Hinweis:** Das frühere Desktop-Repo unter iCloud (`~/Desktop/Bärenwald-Backend/baerenwald-crm-dashboard`) ist APFS-**dataless** — Tooling konnte Dateien/Commits dort nicht zuverlässig lesen. Belal hat entschieden: Weiterarbeit in `~/code`. Der GitHub-Stand (`9915af7` und früher) enthält bereits den Großteil der Produktionsthemen (Sync, Kanäle, Impersonation, PosBoard, `/vorgaenge`).

**Belals Einstieg Endabnahme:** zuerst OFFENE-PUNKTE, dann Entscheidungslog, dann Live-Stichprobe. Screenshots unter `docs/paritaet/` sind iCloud-seitig ggf. evakuiert — Live-Vergleich Mock vs. CRM priorisieren.

---

## Status pro Nummer

| Nr. | Status | Commit-SHA (kanonisch) | Screenshots / Nachweis |
|-----|--------|------------------------|------------------------|
| **1** Listen Welle 1 | **fertig*** | im Batch vor `9915af7` (`v`-Commits) | `docs/paritaet/` — ggf. dataless; Live-Liste prüfen |
| **2** Listen Welle 2 | **fertig*** | dto. | Toolbar/Chiprow/`/vorgaenge`-Grids |
| **3** WizardShell-Optik | **fertig** | dto. | WizardShell Tokens in CSS |
| **4** Status-Sync P0 | **fertig** | `src/lib/portal/sync-portal-lead-status.ts` | Aufrufe in Auftrag-/Angebot-Actions |
| **5** Kanal-Fix P0 | **fertig** | `LeadKanal` + Labels + Badge | hv_direkt/katalog/manuell |
| **6** SQL Cleanup | **übersprungen** | — | Belal in Supabase |
| **7** Impersonation | **fertig** | Token + `/api/portal-impersonate` + CrmPortalOpenButtons + Admin Login | Portal-Banner `AdminViewBanner` |
| **8a** /neu Speichern | **fertig** | **`22bb160`** | Redirect-Race + Standalone-Bootstrap |
| **8b** PosBoard Wizards | **fertig** | vor `9915af7` | AngebotWizard + RechnungWizard |
| **8c** PosBoard Modal/Bulk/DnD | **fertig** | vor `9915af7` | PosBoard/PosTable/PositionModal |
| **9a–c** Resolver → Chips → /vorgaenge | **fertig** | vor `9915af7` | `resolve-vorgang.ts`, `/vorgaenge` |
| **10a** HW-E-Mail Auth | **fertig** | vor `9915af7` | `updateHandwerker` → Admin Auth |
| **10b** Partner-Hinweis | **fertig** | Portal `partner/page.tsx` (Wortlaut „laut CRM“) | + Abmelden / PartnerAuthFlowHint |
| **11** L10 Mobile-Pane | **fertig*** | `.vg-row` Mobile-CSS | Residuen → OFFENE-PUNKTE |

\* „fertig“ = Gap-Analyse im Clone; Desktop-Einzelnachweise (Screenshots, Entscheidungslog aus dem iCloud-Lauf) ggf. unvollständig.

---

## Desktop-Lauf (verwaist / iCloud)

Vor dem Umzug existierten lokale Commits im Desktop-Repo (nicht gepusht), u. a.:

`2354904` Nr.1 · `820e802` Nr.2 · `b666442` Nr.3 · `3d880b0` Nr.4 · `2556e71` Nr.5 · `b4b466e`/`c1989ed`/`f2bb6c0`/`3d8cbc3` Nr.7a–d  

Status: **nicht als disk-sicher verifizierbar** (dataless Pack/Working Tree). Inhaltlich überlappt `~/code` stark.

---

## Entscheidungslog (vollständig)

Siehe live: [`docs/ENTSCHEIDUNGSLOG.md`](ENTSCHEIDUNGSLOG.md)

```
# Entscheidungslog — Autonomer Durchlauf Nr. 1–11

**Workspace ab 2026-07-16:** Arbeit läuft in `/Users/belalmasdjedi/code/baerenwald-system` (außerhalb iCloud). Das Desktop-Repo unter `~/Desktop/Bärenwald-Backend/baerenwald-crm-dashboard` ist APFS-dataless (iCloud) und für tsc/git unbrauchbar — dortige lokale Commits Nr.1–7d sind ggf. nur noch in Cursor-Read lesbar, nicht shell-/disk-sicher.

Format: **Frage** | Optionen | **gewählt** | Begründung

## Recovery 2026-07-16
| Weiterarbeit nach iCloud-Dataless | Warten / Neu aufbauen in ~/code | **~/code/baerenwald-system** | User-Wahl |

## Gap-Analyse ~/code (GitHub tip `9915af7`)
| 1–3 Design | teilweise/fertig | Listen `/vorgaenge`; WizardShell + PosBoard |
| 4–5 P0 | fertig | sync + hv_* |
| 7 Impersonation | fertig | Token + Buttons + Admin Login |
| 8b–c PosBoard | fertig | verdrahtet |
| 9 Resolver/Vorgänge | fertig | `/vorgaenge` |
| 10a/10b | fertig | Auth + Portal-Hinweis |
| 11 Mobile | teilweise→fertig* | `.vg-row` |
| 8a | fertig in `22bb160` | Race + Standalone |

## Nr. 8a
| Root Cause | Speichern fehlschlägt / Redirect-Race | **onDone+onClose Race** | onClose überschreibt Detail |
| Standalone Reload | Nur Race / auch Bootstrap | **beides** | Edit ohne auftrag_id |
```

---

## Offene Punkte (vollständig)

Siehe live: [`docs/OFFENE-PUNKTE.md`](OFFENE-PUNKTE.md)

| ID | Nr. | Was | Warum | Was fehlt |
|----|-----|-----|-------|-----------|
| OP-ICLOUD | — | Desktop-CRM dataless | iCloud-Eviction | Repo dauerhaft außerhalb Desktop/iCloud; „Download Now“ optional |
| OP-DESKTOP-COMMITS | 1–7d | Ungepushte Desktop-Commits | Pack dataless | Nur relevant falls Diff zu `~/code` gewünscht |
| OP-PARITAET-SHOTS | 1–3 | Vergleichs-Screenshots | `docs/paritaet/` ggf. dataless | Belal: Live Mock vs. CRM |
| OP-11-ROW | 11 | Einheitliche `AppEntityListRow` überall | Stammdaten nutzen teils anderes Mobile-Pattern | Nur wenn Mock-Abweichung bei Endabnahme stört |
| OP-6 | 6 | Testleads/HW-Accounts | Belal | Supabase Cleanup |

---

## Empfehlung für Endabnahme

1. Cursor-Workspace öffnen: **`/Users/belalmasdjedi/code/baerenwald-system`** (nicht Desktop-iCloud).
2. E2E mit Impersonation laut Manual-Abschnitt im Auftrag.
3. `/rechnungen/neu` speichern → Detail (nicht Liste) — beweist **8a** (`22bb160`).
4. Portal Partner: Falsche Session-E-Mail → Hinweis + Abmelden (10b).
