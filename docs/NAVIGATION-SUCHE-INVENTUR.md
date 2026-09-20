# Navigation & Suche — Inventur + Soll (Phase A)

**Status:** Freigabe ausstehend — **keine** ⌘K-/Listen-/Menü-Umbauten bis Belal freigibt.  
**Ziel (nach Freigabe):** Eine Suchlogik je App · Zurück zur Herkunftsliste · Listen-State in URL · einheitliche Menü-Namen.

---

## 1. Inventur — Suche

### CRM (`baerenwald-system`)

| Baustein | Datei | Ist |
|----------|-------|-----|
| Shortcut ⌘K / `/` | `GlobalShortcuts.tsx` → `CommandPalette.tsx` | ✅ vorhanden |
| TopBar-Suche | `TopBarSearch.tsx` | ✅ parallel (gruppiert) |
| API | `GET /api/crm/suche?q=` | Anfragen, Kunden, Aufträge, Angebote, Rechnungen, Partner, Netzwerk |
| Recents | `localStorage` `bw-crm-recent-search` | geteilt |

**Lücken**
- **Zwei UIs**, keine gemeinsame Logik (Palette flach, TopBar gruppiert).
- **Kein** Treffer-Typ Vorgänge (aggregiert), **Objekte**, **Dokumente**.
- `/vorgaenge?q=` wird geschrieben, aber von der Liste **nicht gelesen**.

### Portal (`baerenwald`)

| Rolle | Suche | API |
|-------|-------|-----|
| **HV** | `OrganisationSuche` — Autocomplete | `GET /api/org/suche` (nur Vorgänge/Leads, in-memory) |
| Kunde / Partner / HM / Eigentümer | `PortalHeaderSearch` — Stub (Sprung zu Vorgänge) | — |
| **⌘K** | — | **fehlt überall** |

**Soll Suche (je App)**

| App | Einstieg | Gruppen | Darstellung |
|-----|----------|---------|-------------|
| CRM | ⌘K + TopBar = **eine** Komponente/Hook | Vorgänge · Kunden · Objekte · Partner · Dokumente (+ bestehende Entities) | gruppierte Liste, gleiche Zeile (Icon · Titel · Meta · CTA) |
| HV-Portal | ⌘K + Header | Vorgänge · Objekte · (Dokumente wenn freigegeben) | gleiche Listen-UI wie CRM-Palette (Portal-Tokens) |

---

## 2. Inventur — Zurück-Navigation

### CRM

| Pattern | Scope | Limit |
|---------|-------|--------|
| `from=anfrage\|auftrag\|…:{id}` + `AkteRueckwegChip` | Vorgang ↔ Vorgang | **nicht** Liste |
| Statisches `crumbBackHref` | Detail → `/vorgaenge?tab=…` oder `/kunden` | verliert Filter/Seite/q |
| `getDetailRouteMeta` | ungenutzt | — |

### Portal

| Pattern | Scope |
|---------|-------|
| `onBack` / `closeDetail` → `router.replace` ohne `id` | Filter oft erhalten (HV/Partner) |
| Kein Breadcrumb | nur Button „← Zurück“ |
| Kein `return=` / Listen-State-Encoding | — |

**Soll**
- Detail öffnen speichert Herkunft: `return=<url-encoded list path+query>` (oder kurzes `r=`).
- Zurück / Breadcrumb „…“ → genau diese URL (Filter, Sort, Seite).
- Fallback ohne `return`: heutige Default-Liste (nicht Start-Dashboard).

---

## 3. Inventur — Listen merken (URL)

| Liste | In URL heute | Lokal / vergessen |
|-------|--------------|-------------------|
| CRM Vorgänge | `tab`, `lifecycle`, `richtung`, `seite` | `q`, Status-Chips, Sort, Client-Page |
| CRM Kunden / Partner | — (nur `?neu=1`) | Filter, Sort, Page |
| Portal HV Vorgänge | `section`, `filter`, `id`, `objekte` | `page` |
| Portal Partner | `section`, `filter`, `id` | `page` |
| Portal Privat/HM/Eigentümer | `section`, `id` | Filter-Chips, `page` |

**Soll — kanonische Query-Keys (Vorschlag)**

| Key | Bedeutung |
|-----|-----------|
| `q` | Textsuche |
| `filter` / `tab` / `lifecycle` | bestehende Semantik behalten wo schon da |
| `sort` | z. B. `datum_desc` |
| `page` / `seite` | Pagination (CRM bereits `seite`) |
| `return` | nur auf Detail-Routen |

Persistenz = **URL** (shareable/bookmarkable), nicht localStorage für Filter (Spaltenbreiten bleiben localStorage).

---

## 4. Inventur — Menüs Portal (gleiche Bereiche)

Quelle: `portal2/nav-items.ts` + Clients.

| Bereich | HV | Privat (live) | Eigentümer / HM | Partner | Spec Mieter (ungenutzt) |
|---------|-----|---------------|-----------------|---------|-------------------------|
| Home | Dashboard | Übersicht | Dashboard | Start | Start |
| Liste | Vorgänge | Vorgänge | Vorgänge | Vorgänge | Meine Meldungen |
| Objekte | Objekte | — | **Einheiten** | — | — |
| Settings | Einstellungen | Einstellungen | — | **Firmendaten** | Konto |

**Probleme**
- Gleiche Bereiche, **verschiedene Labels** (Dashboard/Übersicht/Start; Einstellungen/Firmendaten).
- Spec `mieter` nicht angebunden (Mieter-WL nutzt `kunde_privat`).
- HM teilt Eigentümer-Nav.
- Partner: `planer`/`gpt` in URL ohne Nav-Eintrag.

**Soll-Vorschlag (Freigabe)**

| Bereich | Einheitlicher Name (alle Rollen, wo vorhanden) |
|---------|-----------------------------------------------|
| Home | **Übersicht** |
| Liste Vorgänge | **Vorgänge** |
| Objekte / Einheiten | **Objekte** (HV) · **Einheiten** nur Eigentümer wenn fachlich nötig — **eine** Entscheidung |
| Profil/Settings | **Einstellungen** (Partner: Einstellungen, Inhalt = Firmendaten) |

---

## 5. Architektur-Vorschlag (Phasen B–D)

### B — Suche
1. CRM: Hook `useAppSearch` + eine `SearchResultsGrouped`-UI; CommandPalette und TopBar konsumieren dieselbe.
2. API: Objekte + Dokumente + Vorgangs-Treffer; Bugfix `vorgaenge?q`.
3. HV-Portal: ⌘K + Header → `OrganisationSuche` erweitern / shared Presentational; API Objekte.

### C — Zurück + Listen-URL
1. `buildListReturnUrl` / `parseReturn` in CRM + Portal.
2. Detail-Links aus Listen setzen `return`.
3. `useListUrlState` für Kunden/Partner/Portal-Chips/`page`.

### D — Menü-Parität
1. `PORTAL_NAV_ITEMS` Labels angleichen laut Freigabe.
2. Mieter-Spec anbinden oder Spec löschen.
3. Guard/Test: gleiche Labels für gleiche `section`-Familie.

---

## 6. Offene Punkte für Freigabe

1. **Such-Gruppen CRM:** nur die 5 genannten (Vorgänge, Kunden, Objekte, Partner, Dokumente) — Angebote/Rechnungen weiter mit in „Vorgänge“ oder eigene Gruppen?  
2. **Dokumente-Suche:** welche Buckets/Tabellen (Akte, Compliance, …)?  
3. **Portal ⌘K:** nur HV oder auch Partner/Kunde?  
4. **Menü-Home-Wort:** Übersicht vs. Dashboard vs. Start — Vorschlag **Übersicht**?  
5. **Objekte vs. Einheiten:** angleichen auf „Objekte“ oder Eigentümer-Sonderlabel behalten?  
6. **Partner Settings:** Label „Einstellungen“ statt „Firmendaten“?

---

## 7. STOPP

**Phase A Ende.** Keine Code-Änderungen an Suche/Nav/Menü bis Freigabe §6.
