# Flow-Katalog — kanonische Jobs (W8-03)

**Stand:** 2026-07-27 (Audit Runde 3)  
**Ziel:** Pro Alltags-Job **ein** bevorzugter Einstieg (Surface + Route). Parallele Wege sind bewusst markiert.

Legende Surface: **Canvas** = `DocumentCanvas` · **Sheet** = `EditorSheet` / `ActionSheet` / `PickerSheet` · **Detail** = Entity-Detail mit Primary/⋯

---

## Versenden

| Entity | Kanonischer Flow | Route / Surface | Code-Anker | Parallele Wege (abbauen?) |
|--------|------------------|-----------------|------------|---------------------------|
| **Angebot (neu)** | Wizard → Senden | Modal/Route → `AngebotWizard` (**Canvas**) | `src/components/angebote/AngebotWizard.tsx` · `sendAngebotWizard` | Anfrage: Inline-Wizard auf Detail · `/angebote/neu` |
| **Angebot (Entwurf → Kunde)** | Detail Primary **Senden** | `/angebote/[id]` · Versand-Modal | `AngebotDetailPageClient.tsx` · `angebote/actions` | ⋯ „Angebot versenden“ · Wizard Schritt Senden |
| **Rechnung** | Wizard → Erstellen und versenden | `RechnungWizard` (**Canvas**) | `RechnungWizard.tsx` · `handleFinish(true)` | Detail Primary Senden · ⋯ |
| **Nachtrag (Kunde)** | E-Mail + Public Link | Auftrag **Vor Ort → Abschluss** | `AuftragNachtragBaustoppSection.tsx` | Vertrag-Nachtrag-PDF separat (`ProjektVertragWizard`) |
| **Partner-Anfrage** | Positionen → Partner | Auftrag Tab **Leistungen** | `AuftragLeistungenV3Tab` · HW-Modals | Angebot Partner-Section · alte Panel-Pfade |

---

## Korrigieren

| Entity | Kanonischer Flow | Route / Surface | Code-Anker | Hinweis |
|--------|------------------|-----------------|------------|---------|
| **Angebot am laufenden Auftrag** | AG-Korrektur-Wizard | `AngebotWizard` `istAuftragKorrektur` (Chips ab Positionen) | `AuftragDetailClient` ⋯/Primary · `angebot-korrektur-actions` | W5-01: Copy-Hilfe Gutschrift vs. Korrektur fehlt |
| **Rechnung (Storno + Neu)** | RE-Wizard / Korrigieren | `/rechnungen/[id]` → Wizard | `RechnungDetailClient` · `rechnungen/actions` Storno-Modi | ⋯ Gutschrift vs. „Rechnung korrigieren“ |
| **Rechnung ohne Ersatz** | Soft-Storno | ⋯ **Ohne Ersatz stornieren** | `RechnungDetailClient.tsx` | W6-04 Copy |
| **Positionen Auftrag** | PosBoard / Leistungen-Tab | `/auftraege/[id]?tab=leistung` | `AuftragLeistungenV3Tab` | Hinweis Abschläge (W5-01 F-37) |

---

## Partner

| Job | Kanonischer Flow | Surface | Code-Anker |
|-----|------------------|---------|------------|
| HW zuweisen & anfragen | Leistungen → Zeile/Gewerk | **Sheet**/Modal | `HandwerkerZuweisenModal` · `AuftragPositionHandwerkerPanel` |
| Partner einreichen prüfen | Angebot Detail Partner | Section + Modal | `HandwerkerEinreichungPruefung.tsx` |
| Vertrag Nachunternehmer | ⋯ **Nachunternehmervertrag** | `ProjektVertragWizard` (**Canvas**) | `AuftragDetailClient` · `vertraege/wizard-actions` |
| Portal-Link | ⋯ **Handwerker-Link versenden** | `entity-menu.ts` | Kunde/Partner-Detail |

---

## Abschluss

| Job | Kanonischer Flow | Route / Surface | Code-Anker |
|-----|------------------|-----------------|------------|
| Abnahmeprotokoll | Create-Wizard | **Canvas** `AbnahmeprotokollCreateWizard` | Auftrag **Vor Ort → Abnahme** |
| Abschlussdoku Kunde | Section in Vor Ort | `AuftragAbschlussSection` (embedded in `AuftragVorOrtPanel`) | Primary bei Status `abnahme` (W9-06) |
| Nachtrag / Baustopp (operativ) | Abschluss-Extras | `AuftragNachtragBaustoppSection` unter Vor Ort | Manueller Nachtrag + Liste; Vertrag-Nachtrag über ⋯ |
| Auftrag abschließen | Status + Zahlung | Detail Primary / ⋯ | `updateAuftragStatusFromUi` · Zahlung offen Badge (#5) |

---

## Suche & Chrome (Querschnitt)

| Surface | Implementierung | AG/RE in Suche? |
|---------|-----------------|-----------------|
| TopBar (live) | `TopBarSearch` → `GET /api/crm/suche` | **Ja** — `angebote` (Nr./Leistungsumfang) + `rechnungen` (Nr.), Gruppen laut `sub`-Prefix |
| Legacy | `GlobalSearch.tsx` (Client-Supabase, parallel) | Ja; nicht in TopBar verdrahtet |

**W6-08 ✅:** `src/app/api/crm/suche/route.ts` — Icons `file-invoice` / `receipt`, `sub` mit `Angebot` / `Rechnung` für TopBar-Gruppierung.

---

## Offene Konsolidierung (W11-03)

| Wizard | Chips | Weiter-Gate |
|--------|-------|-------------|
| `AngebotWizard` | `goToSection` frei klickbar | **Weiter:** Toast bei fehlendem Entwurf vor Vorschau, Navigation bleibt offen; **Senden/Erstellen:** `persistDraft` + Validierung |
| `RechnungWizard` | `goToSection` frei | **Weiter:** Hinweis bei leeren Positionen / Plan; Entwurf best-effort vor Schritt Senden; **Erstellen/Versenden:** unverändert hart |

**W11-03 light ✅:** Chip-Navigation unverändert frei; Mobile-Footer „Weiter“ als Shortcut ohne Pflicht-Gates außer finalem Versand.

---

## Referenzen

- [AUDIT-TODOS.md](./AUDIT-TODOS.md) W8-03 · W11-03  
- [CRM-ALLTAG-AUDIT.md](./CRM-ALLTAG-AUDIT.md) § W8-03  
- [UMSETZUNGSPLAN-SURFACE.md](./UMSETZUNGSPLAN-SURFACE.md) DocumentCanvas / Sheets
