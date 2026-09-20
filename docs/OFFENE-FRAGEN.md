# Offene Fragen (Belal-Freigabe nötig)

Regel: Agent entscheidet nicht. Unklarheiten hier eintragen und mit dem nächsten geregelten Punkt weitermachen.

| Datum | Thema | Frage | Block |
|-------|--------|-------|-------|
| 2026-09-20 | N7 Partner planer/gpt | Sections `planer` und `gpt` sind im Partner-Portal per Deep-Link erreichbar, aber nicht in `PORTAL_NAV_ITEMS`. Option A: Menüpunkte „Planer“ / „GPT“ ergänzen. Option B: Routes/Sections entfernen (nur Deep-Link tot). Welche Variante? | N |

*(Prod-Migrationen 19.09. + Deploy-Reihenfolge: `docs/ABSCHLUSS.md` — Manuell für Belal.)*

*(Weitere Zeilen bei Bedarf anhängen.)*

### Erledigt 2026-09-20 (Freigaben O1–O6)

| Thema | Entscheidung |
|-------|----------------|
| Portal `.gitignore` | Markdown unter `docs/` versionieren; nur `docs/tmp/` ignorieren |
| Portal `@`-Alias | `baseUrl` + Webpack-Alias bleiben; Begründung in Portal-README |
| P5-3 Rest-Confirms | Reine Ja/Nein → ConfirmPopup (Liste: `docs/O3-CONFIRM-POPUP.md`) |
| P4-1 Heuristik | Gate no_error &lt; 50; `// bewusst ignoriert:` zählt nicht |
| Phase A F2 Portal-PDF | Kein Chromium im Portal; CRM `POST /api/pdf/render` + `PDF_SERVICE_SECRET` (M10) |
| P5-7 Menüs | `ListbarActionsMenu` + `ActionsMenu` in `DetailActionsBar` = Kanon (Chrome) |

### P5-7 Menüs (Kanon, O6)

- **Zeilen:** `MockEntityRowMenu` (u. a. Angebot-/Rechnung-Auswahl).
- **Chrome (akzeptiert):** `DetailActionsBar` + `ActionsMenuItem`-Typ (`actions-menu.tsx`) + `ActionSheet`. Kein neues Zeilen-Menü außerhalb dieses Kanons. (`ListbarActionsMenu` / JSX-`ActionsMenu` bereits entfernt; Reste als Typ/Chrome ok.)
