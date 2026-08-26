# AUFTRAG C — Fundliste (C1 / C2 / C3 / C4 / C5 / C6)

**Datum:** 2026-08-26  
**Repo:** `baerenwald-system`

## C1 — Doppel-Add (Empty-CTA raus)

| Datei | Fix |
|-------|-----|
| `ObjektHausmeisterCard.tsx` | Empty-Action „Anlegen“ entfernt; Hint → Header „+“ |
| `ObjektEinheitenSection.tsx` | Empty-Action „Hinzufügen“ entfernt; Hint → Header |
| `ObjektBewohnerSection.tsx` | Empty-Action entfernt; Hint → Header |
| `ObjektKontakteSection.tsx` | Empty-Action entfernt; Hint → Header |
| `KundenObjekteCard.tsx` | Empty-Action entfernt; Hint → Header |
| `KundenAnsprechpartnerCard.tsx` | Empty-Action entfernt; Hint → Header |
| `AnfrageLeadTabsShared.tsx` | Empty „+ Angebot erstellen“ entfernt (Header-CTA bleibt) |

### Absichtlich belassen (kein Doppel-Header)

| Datei | Grund |
|-------|-------|
| `KundenListeClient.tsx` | Listen-Empty = einziger Primary („Neuen Kunden anlegen“) |
| `HandwerkerListeClient.tsx` | Listen-Empty = einziger Primary („Handwerker anlegen“) |

## C2 — Text-Aktionen → echte Controls

| Fix | Dateien |
|-----|---------|
| `ListRowCheck` statt `div.vg-check` + nested `vg-box`/`MockIcon` | `VorgaengeListeClient`, `KundenListeClient`, `HandwerkerListeClient`, `ObjektEinheitenSection`, `ObjektBewohnerSection`, `ObjektKontakteSection`, `KundenObjekteCard`, `KundenAnsprechpartnerCard` |
| Hausmeister Portal Invite/Login: `MockBtn sm kind="ghost" icon="send"|"log-in"` statt `vgid-portal__invite|login` | `ObjektHausmeisterCard.tsx` |

Komponente: `src/components/ui/ListRowCheck.tsx` (Button + `aria-pressed`, behält Klasse `.vg-check` für Layout-CSS).

## C3 — Loading / Splash

| Stelle | Fix |
|--------|-----|
| Login-Submit | Spinner im Button (`crm-login__submit-spinner`) + Overlay „Anmeldung läuft…“ |
| Dashboard `loading.tsx` | Skeleton-Liste (`CrmPageLoading variant="list"`) bis Content |
| `/auth/callback` | Splash + **Server Action** `completeAuthCallback` (kein Client-PKCE) |
| PWA `manifest.json` | `background_color` `#F7F6F3` (Splash/Theme-Align) |
| Lange Mutationen | weiter über `actionBusy` Overlay |

## C4 — Aktions-Art → eine Variante

| Aktions-Art | Variante | Angleichung |
|-------------|----------|-------------|
| Login / Haupt-Submit | primary | Login-Button |
| Hinzufügen | primary (Header) | C1: Empty ohne 2. Primary |
| Download / PDF öffnen | ghost | bereits `btn ghost` an Baustellen-Docs |
| Kopieren | ghost | Nachtrag „Link kopieren“ |
| Filter-Reset | ghost | Listen-Clients |
| Abbrechen | ghost / secondary Footer | unverändert Modal-Footer |

Leitfaden: `docs/ui-audit/PATTERN-LEITFADEN.md` §1 Tabelle „Aktions-Art“.

## C5 — Success-Toasts nach Mutation

| Stelle | Toast |
|--------|-------|
| `AuftragFinanzenClient` — `toggleEingangsrechnungBezahlt` | „Als bezahlt markiert“ / „Bezahlt zurückgenommen“ |
| `AuftragDokumenteTab` — Freigabe / Meta / Delete | kurz DE |
| `AuftragPositionHandwerkerPanel` — Status | „Status aktualisiert“ |
| `AuftragNachtragBaustoppSection` — HW bestätigt | gesetzt/entfernt |
| `BaustelleBerichteDokumenteCard` — Delete | „Dokument gelöscht“ |
| `BaustelleRegiearbeitenCard` — Delete | „Regiearbeit gelöscht“ |
| `KundenNotizenTab` / `AnfrageNotizenTab` / `AnfrageLeadTabsShared` | Add + Delete |
| `LeadProjektWasBlock` — `persist` | „Gespeichert“ (Remove: „Leistung entfernt“) |

**Skipped (bewusst stumm):** Keystroke-Autosaves (Kunde Custom Fields / Handwerker-Notizen-Autosave).

## C7 — Schwebender Text → **Backlog B-05**

| | |
|--|--|
| **ID** | **B-05** |
| **Status** | Backlog — **wartet auf Fundstelle** (Belal-Screenshot) |
| **Thema** | Schwebender Text (Card-Body vs. i-Icon im Card-Header) |
| **Aktion** | Nicht weiter verfolgen, bis Fundstelle vorliegt |

*(Früher: „Wartet auf Belals Screenshot“ — jetzt als B-05 eingefroren.)*

