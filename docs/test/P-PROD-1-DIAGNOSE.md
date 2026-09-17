# P-PROD-1 Diagnose — Stand nach Staging-Smoke (Deploy + R3)

**Datum:** 2026-08-26  
**Quellen:** Staging-Smoke admin + Staff2 · Prod SELECT (`wnotlydvhsmfkhexgeol`) · `schema_migrations`

## Verdict für Hotfix-Paket

| Thema | Staging-Beweis | Prod-Befund | Ins Hotfix? |
|-------|----------------|-------------|------------|
| View–Action-Parität („Als bezahlt“ bei fremdem `erstellt_von`) | ✅ admin + ✅ Staff2 auf LEGACY-fremd `…023` | **RE2026-2111** `gesendet`, Creator `info@baerenwald-muenchen.de` — alle 14 gesendeten RE haben denselben Creator → **jeder andere Staff** trifft die Klasse | **Ja — Code** (`requireStaffAndServiceRole`) |
| Alt-Status-Badge (Rohwert / grau) | ✅ `versendet` / `teilbezahlt` / `wartend` | Enum-Status auf Prod kanonisch (keine Alt-Strings in Aggregat); Fix schadet nicht | **Ja — Code** (klein, schon deployed Staging) |
| Rechnung `menuItems={[]}` | ⏭️ Header-⋯ fehlt; PDF ✅ in Akte; Storno/Mahnung **ohne CTA** | UI-Lücke, kein Daten-Hotfix | **Nein** (separates UI-Ticket) |
| PRODSIM auf Staging | ⏭️ keine Zeilen | Export/Import nachziehen für Historie-Smoke | **Nein** für Hotfix |
| Tote FKs (Kern-FKs) | LEGACY bewusst | Count **0** (Auftrag↔Angebot/Lead/Kunde, RE↔Auftrag/Angebot/Kunde, Planpos) | **Kein Daten-Repair nötig** für diese Checks |
| Migrationen Staging ahead | 4 Versions in `schema_migrations` | Prod max tracked `20260816223912`, aber Spalten `ansprechpartner_id` / `kunde_objekt_id` **existieren** auf Prod (Schema ≠ Tracking). Staging-Tracking unvollständig (nur 4 Rows). | **Kein Blocker** für Parity-Hotfix; Migrations-Hygiene separat |

## 1. Smoke (nach CRM-Deploy)

- Report admin: `docs/test/AKTIONS-SMOKE-R3.md` — **0 ❌ / 0 💥**
- Report Staff2: `docs/test/AKTIONS-SMOKE-R3-STAFF2.md` — gleiche Parity-Klasse ✅
- Kritisch: **Als bezahlt** + **bezahlt zurücknehmen** auf fremdem LEGACY-RE → ✅
- Alt-Status Angebot: Badge-Text **`versendet`** (nicht Entwurf)

## 2. Rechnung menuItems

`RechnungDetailClient`: `menuItems={[]}` fest verdrahtet → `DetailActionsBar` blendet ⋯ aus.

| Aktion | Erreichbar? | Wo |
|--------|-------------|-----|
| Storno / Soft-Storno | ❌ Detail | Server-Actions + Korrektur-Modal existieren, **kein CTA** (Bearbeiten disabled → nur Toast) |
| Mahnung | ❌ Detail | `ZahlungserinnerungMailModal` mounted, `setErinnerungModalOpen(true)` **nirgends** |
| PDF | ✅ | Tab **Akte/Dokumente** (`RechnungDokumenteTab`) |
| Löschen | ✅ nur Entwurf | Auftrag → Rechnungs-Liste `RechnungAuswahlPanel` ⋯ |

→ Fund dokumentiert; Skript prüft Overflow + PDF-Tab; Storno/Mahnung bleiben ⏭️ bis UI verdrahtet.

## 3. Migrationen / Versionen

**Prod** (`schema_migrations` desc): … → `20260816223912` `objekt_einheiten_crm_rls`  
**Staging** (nur 4 Einträge — Baseline vermutlich ohne volle Historie):

- `20260818133826` angebot_handwerker_rechnung_13b_flag  
- `20260824205303` belegnummer_erst_bei_versand  
- `20260824220617` rechnungen_ansprechpartner_id  
- `20260824222225` rechnungen_kunde_objekt_id  

Repo `baerenwald-system/supabase/migrations` enthält weitere Dateien mit anderen Timestamps — Abgleich Dateiname↔applied separat pflegen.

## 4. Prod-Zielobjekt Parity

| Feld | Wert |
|------|------|
| RE | **RE2026-2111** |
| id | `3778e0e3-6593-48f4-a098-f45583b1bb12` |
| status | `gesendet` |
| erstellt_von | `info@baerenwald-muenchen.de` (`38d90223-…`) |

## 5. Empfohlenes Prod-Hotfix-Paket

1. **CRM-Deploy** mit View–Action-Parität + Alt-Status-Fallback (Staging bereits grün).  
2. **Smoke auf Prod** (oder Staging-Spiegel): Staff ≠ Creator öffnet RE2026-2111 → „Als bezahlt“ ohne „nicht gefunden“.  
3. **Nicht** im Hotfix: menuItems-Befüllung, PRODSIM-Import, tote-FK-Datenrepair (Counts 0).  
4. **Migrations-Nachzug** Prod nur nach Spalten-Diff / explizitem Go — unabhängig von Parity-Code.
