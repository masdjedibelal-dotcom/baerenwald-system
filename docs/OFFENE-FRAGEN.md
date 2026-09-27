# Offene Fragen (Belal-Freigabe nötig)

Regel: Agent entscheidet nicht. Unklarheiten hier eintragen und mit dem nächsten geregelten Punkt weitermachen.

| Datum | Thema | Frage | Block |
|-------|--------|-------|-------|
| 2026-09-20 | N7 Partner planer/gpt | Sections `planer` und `gpt` sind im Partner-Portal per Deep-Link erreichbar, aber nicht in `PORTAL_NAV_ITEMS`. Option A: Menüpunkte „Planer“ / „GPT“ ergänzen. Option B: Routes/Sections entfernen (nur Deep-Link tot). Welche Variante? | N |
| 2026-09-26 | Partner-Schicht Titel/Text bei Zuweisung | Beim Zuweisen (einzeln/mehrere) optional Partner-Titel + Partner-Beschreibung; leer = LV-Text der Positionen. CRM behält Einzelpositionen; Partner sieht eine Aufgabe. **Speicherort:** A) an `auftrag_handwerker` / `angebot_handwerker` (`partner_titel`, `partner_beschreibung`) — eine Formulierung für die Gruppe; B) Override-Felder pro `auftrag_positionen` — fein, aber kein „eine Sicht“. **Scope:** nur Auftrag, oder auch Angebots-Zuweisung? Heute überschreibt das Einzel-Sheet oft Kunden-`leistung_name` — das soll weg. Entscheidung A/B + Scope, dann eigener Auftrag. | — |

*(Prod-Migrationen 19.09. + Deploy-Reihenfolge: `docs/ABSCHLUSS.md` — Manuell für Belal.)*

*(Weitere Zeilen bei Bedarf anhängen.)*

### Partner-Schicht Zuweisung (Kurz, 2026-09-26)

- **Ziel:** LV/Detail bleibt für Kunde (Angebot/Rechnung); Partner bekommt optional andere Formulierung; bei Mehrfach-Zuweisung eine Partner-Aufgabe über `positionIds[]`.
- **Nicht:** Kundenfelder überschreiben; keine echte Zusammenlegung der Abrechnungspositionen.
- **Empfehlung Agent (nicht entschieden):** Variante **A** (Felder an der Zuweisung) + Scope **Auftrag zuerst**, Angebot später spiegeln.
- **Offen für Belal:** A oder B? Nur Auftrag oder auch Angebot?

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
