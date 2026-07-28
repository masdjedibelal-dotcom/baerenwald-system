# N3 — Toast-Platzhalter durch echte Funktionen

**Stand:** 2026-07-28  
**Commit-Message:** `N3: Toast-Platzhalter durch echte Funktionen.`

## Erledigt

| Punkt | Vorher | Nachher |
|---|---|---|
| Tagebuch aus Position | Toast „Partner erfasst im Portal…“ | `CrmPositionEintragModal` → `createCrmPositionEintrag` / `position_eintraege`; Drawer-CTA + Button unter Tabelle; Einträge erscheinen im Leistungs-Drawer |
| Bewertung einholen | Toast „folgt in einer späteren Phase“ | `HandwerkerBewertungModal` (Auftrag Primary-CTA + Rechnung Primary-CTA via `loadHandwerkerBewertungZiele`) |
| PDF-CTAs | API-only | Links: Objektakte → `/api/objekte/[id]/aushang-pdf`; Auftrag Leistungen + Akte/Dokumente → Regiebericht- + Bautagebuch-Lebenszyklus |
| Nachtrag-Persistenz | Section ungemountet; Wizard schrieb nur Angebot | `AuftragNachtragBaustoppSection` unter Leistungen; Wizard-Save → `upsertNachtragEntwurfFromAngebotWizard` in Tabelle `nachtraege`; Bootstrap lädt `nachtraege(*)` (auch Fallback-Select) |

## Bewusst Platzhalter / Grenzen

| Thema | Begründung |
|---|---|
| Vollständiges CRM-Bautagebuch-Tab (Phase-13 entfernt) | Spec: kein Tagebuch-Tab/Segment; Einstieg nur Drawer/Button + Lebenszyklus-PDF |
| `angebot_id` an `nachtraege` | Kein Schema-Feld; Upsert über Marker `[crm:angebot:…]` in `beschreibung` — ausreichend für Entwurf-Update ohne Migration |
| Bewertung ohne Auftrags-HW | Modal zeigt Leerzustand „Keine Handwerker…“; kein Fake-Mail-Flow |
| Spalten-⋯ Nutzer-Defaults (Phase 6) | Unabhängig von N3 — bleibt offen |
| Aushang braucht `org_kennung` | API liefert Fehler-JSON wenn HV-Portal-Kennung fehlt — UI-Link bleibt sichtbar |
