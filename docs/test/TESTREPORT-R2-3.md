# TESTREPORT — R2-Etappe 3 (Regression)

| Feld | Wert |
|---|---|
| Etappe | R2-3 — Regression |
| Datum | 2026-08-25 |
| Umgebung | Staging CRM · Website · Supabase `soqownnkxmtfgvsbrgsl` |
| Methode | Playwright (Confirms dismissed) |
| Screenshots | `docs/test/screenshots/r2-3/` |
| Ergebnis | **7 ✅ · 3 ⚠️ · 2 🚫** von 12 |

Ziel: Bestehendes nach Fixes weiter ok. Kurz je Fall.

---

## Ergebnisse

| ID | Status | Kurz |
|---|---|---|
| R2-R-01 | ⚠️ | Melde-Funnel startet, Bereich→Details→Fotos erreichbar (`r01-melde-mid.png`). Voll-Submit in dieser Etappe nicht erneut (bereits R2-2 belegt). CTA auf Bestätigung weiterhin neutral (`r11-cta.png`). Objekt-Hinweis-Regression: siehe offenes **F-161**. |
| R2-R-02 | ✅ | Cookie-Banner Ablehnen/Akzeptieren gleich groß (136×40). PostHog-Resource **vor** Consent nicht gesehen. Ablehnen geklickt. |
| R2-R-03 | ✅ | Footer Impressum+Datenschutz je 1 Klick. Impressum mit VSBG/Verbraucherschlichtung. |
| R2-R-04 | 🚫 | Notiz-Textarea auf Lead-Akte in Automation nicht gefunden (`r04-no-note.png`). XSS-/Lösch-Pfad Autor nicht live belegt. |
| R2-R-05 | ✅ | Suche vorhanden („Filter & Suchen“). **CSV exportieren** per `title` vorhanden. Bulk-Löschen-Modal nicht separat geklickt (Confirm-Regel). |
| R2-R-06 | ✅ | Viewport 375: `scrollWidth=clientWidth`, kein H-Scroll. Bottom-Nav-Texte sichtbar. FAB als „+“ nicht gefunden (ggf. anderes Muster) — kein Layout-Bruch. |
| R2-R-07 | ✅ | Unauth `/anfragen` → `/login`. Login ~3–4 s bis Dashboard. Rate-Limit blockiert Normal-Login nicht. |
| R2-R-08 | ⚠️ | `/angebote/neu` lädt Wizard-Oberfläche (`hasWizard=true`). Speichern/Wiederöffnen-Runde nicht vollständig durchgespielt. |
| R2-R-09 | ✅ | HV-Nord Login → `/portal` Dashboard mit Vorgänge/Übersicht (`r09-dash.png`). |
| R2-R-10 | ✅ | **Wichtigster Fall:** Partner Elektro nach Login sieht aktive Zuweisung „ZZTEST-R2 Steckdosen…“; Detail öffnet (Objekt/Adresse/Situation). RLS hat aktive Partner **nicht** mitgesperrt. BT-Schreiben in UI nicht in <2 Min gefunden (⚠️ Teilaspekt, kein Sperr-Beweis). Deep-Link `/partner/auftraege/…` = Marketing-404 (nicht Portal-Route) — akzeptiertes Routing-Ist. |
| R2-R-11 | ✅ | CTA „Konto anlegen, um Ihre Meldungen zu verfolgen“, kein „Zu Bärenwald“. |
| R2-R-12 | 🚫 | Alle Seed-Orgs haben `org_primary_color = null`. Gesetzte Farbe nicht prüfbar. Melde zeigt Fallback `--primary`/`#2e7d52` (BW-Grün) — passt zu Anthrazit-Soll nur wenn Fallback umgebaut; hier **kein** Org-mit-Farbe-Gegenbeweis. |

---

## Funde (neu in R2-3)

Keine neuen Blocker aus Regression. Offene Alt-Funde bleiben: F-160, F-161, F-162, F-164.

**Hinweis R12:** Für belastbaren Verify eine ZZTEST-Org mit gesetzter Primary-Farbe anlegen (nicht Seed mutieren).

---

## ZZTEST / Aufräumen

Keine neuen Destruktionen. Lead `6eba4479-…` unberührt gelassen.
