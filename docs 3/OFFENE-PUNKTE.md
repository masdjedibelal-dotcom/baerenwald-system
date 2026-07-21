# Offene Punkte — Autonomer Durchlauf Nr. 1–11

| ID | Nr. | Was | Warum blockiert / zurückgestellt | Was fehlt |
|----|-----|-----|----------------------------------|-----------|
| OP-1 | 1/2 | Dots-/entityMenu in Listenzeilen (Angebote, Aufträge, Kunden, HW, Partner) | Keine Row-Actions-Logik im CRM; „Kein Feature ohne Funktion“ | Nach Nr. 7d: Admin Login, Anrufen/Mail wo Daten da, Öffnen — Rest Struktur-Lücke |
| OP-2 | 1 | L10 Mobile-Pane | Explizit zurückgestellt | Nr. 11 |
| OP-3 | ~~2~~ | ~~Chips die Resolver-Phasen brauchen~~ | **Erledigt** Nr. 9b | Status-Chips = Resolver-`unterstatus` |
| OP-4 | ~~2/9b~~ | ~~Angebot-Chips fine Stages~~ | **Erledigt** Nr. 9b | Labels in `vorgang-labels` + Filter bei Phase Angebot |
| OP-5 | 2 | ListToolbar.tsx verwaist | Freigegeben zur Löschung (Konsolidierung 2026-07-16) | In Nr. 1–2 Review löschen |
| OP-6 | 6 | SQL-Cleanup Testleads / HW-Accounts | Belal selbst | Supabase |
| OP-ICLOUD | — | Desktop-CRM archiviert | Konsolidierung nach `~/code` abgeschlossen | Desktop-Ordner `*_ARCHIV` — nicht mehr als Arbeitsroot |
| OP-PARITAET-SHOTS | 1–3 | Vergleichs-Screenshots `docs/paritaet/` | Bei Bedarf Live Mock vs. CRM | Belal Endabnahme |
| OP-11-ROW | 11 | `AppEntityListRow` nicht überall | Mobile läuft über `.vg-row` / ListMobileStack | Nur wenn Endabnahme Mock-Abweichung meldet |
| OP-MOCK-SWEEP-01 | Sweep | Entfernte Kommunikationsblöcke in Detailscreens | Mock-Only verlangt Reduktion der Zusatzmodule | Ersatzzugang für Auftrag/Rechnung/Kunde-Kommunikation definieren |
| OP-MOCK-SWEEP-02 | Sweep | Entfernte Projekt-/Freigabe-/KI-Banner in Detailscreens | Nicht mock-konforme Zusatzblöcke | Bei Bedarf mock-konforme kompakte Metazeile definieren |
| OP-MOCK-SWEEP-03 | Sweep | Entfernte KPI-/Bewertungs-/Einbehalt-Übersichten | Zusatz-Cards außerhalb Mock-Kern | Entscheiden, ob in separatem Reporting-Screen verfügbar machen |
| OP-ICON-AUDIT-01 | ~~Sweep~~ | ~~RechnungDetailClient~~ | **Erledigt** Nr. 4 — `MockIcon ctx` + Token | — |
| OP-ICON-AUDIT-02 | ~~Sweep~~ | ~~KundeDetailClient~~ | **Erledigt** Nr. 4 | — |
| OP-ICON-AUDIT-03 | ~~Sweep~~ | ~~HandwerkerDetailClient~~ | **Erledigt** Nr. 4 | — |
| OP-ICON-SYSTEM | 4 | Systemweite Icon-Farben | **Erledigt** — `docs/ICON-FARB-SYSTEM.md`, `check-icon-context.mjs` | — |
| OP-SHELL-01 | 8a | KI Hub nicht in Sidebar/Bottom-Nav | Positivliste hat keinen KI-Hub-Nav-Eintrag | Zugang nur Deep-Link `/ki-analytics` oder später Mock-Muster |
| OP-SHELL-02 | 8a | Abmelden auf Mehr-Screen | Nicht in Mock-Mehr-Tiles; Funktionsschutz | Behalten bis Mock/Einstellungen-Platz definiert |
| OP-LISTEN-01 | 8b | Demo-Anfragen-Banner entfernt | Kein Mock-Element; Lösch-CTA weg | Demo-Cleanup nur noch via SQL/Admin |
| OP-LISTEN-02 | 8b | Separate Phasen-Listen gelöscht | Positivliste: Zugang über Vorgänge | Deep-Links `/anfragen`… redirecten; Detail-Routen bleiben |
| OP-DETAIL-01 | 8c | Status „Nicht erreichbar“ im Anfrage-⋯ | Positivliste verlangt Eintrag | StatusModal erweitern |
| OP-DETAIL-02 | 8c | Angebot/Rechnung Notizen-Inhalt | Tab laut Mock, Datenmodell dünn | Notizen-Persistenz oder Tab nur bei Daten |
| OP-DETAIL-03 | 8c | Rechnung Verlauf leer | Tab umbenannt, Timeline fehlt | Timeline anbinden |
| OP-8d-01 | 8d | Kunde-Detail Vorgänge-Tab ohne `VorgaengeListeClient` | Kein `restrictKunde` in Loader | `loadVorgaengeListe` + Filter nach Kunde |
| OP-8d-02 | 8d | Partner-Detail Vorgänge-Tab leer | Kein Partner-Vorgangs-Filter in Liste | `restrictPartnerName` anbinden |
| OP-8d-03 | 8d | Partner ⋯ „Löschen“ | Positivliste verlangt Eintrag; kein Modal verdrahtet | Löschen-Modal + API |
| OP-8d-04 | 8d | Handwerker-Liste Bewertungsspalte | Mock-Spalte, keine DB-Feld | Bewertungs-Aggregation oder Spalte entfernen |
| OP-8e-01 | ~~8e~~ | ~~Angebot-Wizard Rechtliche Hinweise~~ | **Erledigt v7** — Steuer-Hinweise gehören in den Rechnungs-Wizard (§35a / Reverse-Charge) | — |
| OP-8e-02 | ~~8e~~ | ~~Angebot-Wizard Dokumenttyp/Projekt/Fotos~~ | **Erledigt v7** — Step „Typ & Projekt“ mit Doctype, Titel, Beschreibung, Fotos | — |
| OP-9c-BULK | 9c | Vorgänge Multi-Select Bulk-Aktionen | Nur Export, Löschen (sequenziell pro Lead), Öffnen (1 Zeile) verdrahtet | Bulk-Kopieren, Status ändern, Versenden — kein API |
| OP-ZAHLPLAN-01 | Zahlplan | Row-Aktion „Nochmal versenden“ | Kein Resend-Flow von Auftrag-Zahlplan verdrahtet | Rechnung-Mail erneut senden anbinden oder Menüpunkt weglassen |
