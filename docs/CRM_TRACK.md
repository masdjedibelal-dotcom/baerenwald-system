# CRM-Track — abgestimmter Plan (nur `baerenwald-crm-dashboard`)

Stand: Juli 2026  
**Repo:** `baerenwald-crm-dashboard` (nicht `handwerks-plattform`)  
**Portal-Track:** Design/WL in `handwerks-plattform` — parallel, entkoppelt  
**Verbindung:** Supabase + geteilte Resolver-Fixtures (`shared/crm-vorgang/resolve-vorgang.fixtures.json`)

---

## Repo-Trennung (fix)

| | Portal | CRM |
|--|--------|-----|
| Zielgruppe | Mieter, HV, Partner | Bärenwald-Ops |
| Mockup | Portale-Mock (Optik) | `Baerenwald CRM (standalone) (2).html` (verbindlich) |
| Umzug/Verschmelzung | **Nein** | **Nein** |

Dieses Dokument ist die **einzige Reihenfolge** für CRM-Arbeit. Die frühere „5-Punkte-Liste“ aus [ORGANISATION_PORTAL_BACKEND.md](./ORGANISATION_PORTAL_BACKEND.md) ist **kein paralleler Plan** — siehe Phase D unten.

**Domänen-Spec:** [ENTWICKLER-SPEC.md](./ENTWICKLER-SPEC.md) (technische Regeln)  
**UI-Komponenten:** `KOMPONENTEN.md` im Mock-Ordner (Prototyp-Referenz)

---

## Schrittfolge (CRM-Session)

### Schritt 0 — Spec-Patch ✅

### Schritt 1 — Checkout-Audit ✅

`npm run test:checkout-audit` — kritische Dateien, Imports, Shared-Fixtures, `.env.local`-Keys.

### Schritt 2 — `resolveVorgang()` + Fixtures ✅

`shared/crm-vorgang/resolve-vorgang.fixtures.json` (byte-identisch mit Portal). Tests: `npm run test:resolve-vorgang`.

---

## Phasen A–D (Mockup-Umbau) ✅

| Phase | Inhalt (Kurz) | Status |
|-------|----------------|--------|
| **A** | Konditionen / Anfragen bis „übernommen“ | ✅ |
| **B** | Angebot → Auftrag | ✅ |
| **C** | Nachreichung | ✅ |
| **D** | HV-Support & Erweiterungen | ✅ |

---

## Phase D — ehem. „5-Punkte-Liste“ (einsortiert)

Aus [ORGANISATION_PORTAL_BACKEND.md](./ORGANISATION_PORTAL_BACKEND.md) — **nur als Phase-D-Einträge**, nicht vor A–C:

| ID | Thema | Portal-Stand |
|----|--------|--------------|
| **D1** | Objekte / `melde_slug`, Melde-Links, QR optional | Portal ✅ / CRM ✅ |
| **D2** | Types + Kunden-Tab Organisation (`portal_modus`, Org-Felder, Freigabe-Regeln) | Portal ✅ / CRM ✅ |
| **D3** | Anfragen-Filter + Lead-Detail-Blöcke (HV-Kontext) | CRM ✅ |
| **D4** | Freigabe-Workflow + Partner-Gate in `send-handwerker-anfrage` | Portal ✅ / CRM ✅ |
| **D5** | E-Mail-Templates CRM (M9 Org-Einladung, …) | CRM ✅ |

---

## Kickoff-Prompt (neue Cursor-Session im CRM-Repo)

```
Wir starten den abgestimmten CRM-Plan in diesem Repo. Referenzen: Baerenwald CRM (standalone) (2).html (UI verbindlich), ENTWICKLER-SPEC.md, KOMPONENTEN.md, Resolver-Spec. Schritt 0: Spec-Patch (7 Punkte) — Diff zeigen, Stopp. Schritt 1: Checkout-Audit — Liste zeigen, Stopp. Schritt 2: resolveVorgang() — Fixtures aus Portal-Repo als geteilte JSON, Testlauf, Stopp. Danach Phasen A–D laut docs/CRM_TRACK.md. Lösch-Regel und Feature-Paritäts-Regel gelten durchgehend.
```

---

## Resolver-Parität ohne Doppelwahrheit

- **Code:** je Repo eigene `resolveVorgang()`-Implementierung (kein Shared-Package).
- **Wahrheit für Tests:** eine JSON-Datei, beide Repos laden sie in CI.
- **Portal-only Tests:** `role-status`, `portal-resolve` bleiben in `handwerks-plattform/scripts/test-crm-vorgang-resolver.ts` — nicht in der Shared-JSON.

---

## Phase E — Design-Wave Mock (Option A) 🔄

**Plan:** [DESIGN_WAVE_MOCK.md](./DESIGN_WAVE_MOCK.md)

| ID | Inhalt | Status |
|----|--------|--------|
| **E0** | Foundation + Layout-Umbau (kein Split, volle Tabellen) | ✅ |
| **E1** | Listen — alle auf `mode="page"` + Pagination | 🔄 |
| **E2** | Shell (FAB, TopBar-Suche) | teilweise |
| **E3** | Dashboard „Heute“ | offen |
| **E4** | Detail-Screens einheitlich | offen |
| **E5** | Wizards/Modals | teilweise (Phase D) |

---

## Verwandte Docs

- [DESIGN_WAVE_MOCK.md](./DESIGN_WAVE_MOCK.md) — Mock-Optik global
- [ENTWICKLER-SPEC.md](./ENTWICKLER-SPEC.md) — Domänenregeln & Abnahme
- [ORGANISATION_PORTAL_BACKEND.md](./ORGANISATION_PORTAL_BACKEND.md) — Portal-fertig, CRM-Handoff-Details
- [DESIGN_GAP_ANALYSE_PORTALE.md](./DESIGN_GAP_ANALYSE_PORTALE.md) — Portal-Design (P0-1 PortalShell)
- [WAVE_WHITELABEL_KOMMUNIKATION.md](./WAVE_WHITELABEL_KOMMUNIKATION.md) — WL-Wave Portal
