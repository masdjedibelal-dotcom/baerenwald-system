<<<<<<< Updated upstream
# Audit: Blocker nur Belal (M1–M10)

Stand: 2026-09-20  
=======
# Audit: Blocker nur Belal (M1–M8)

Stand: 2026-09-19  
>>>>>>> Stashed changes
Kein Agent-Code für diese Punkte. Nach Code-Blöcken am Ende erledigen.

| ID | Thema | Aktion |
|----|--------|--------|
| **M1** | Netlify-Region | Functions in **dieselbe Region wie Supabase Prod**: `eu-west-1` (Irland). Nicht Frankfurt/`fra`. Staging-DB liegt in `eu-central-1` — Prod-Traffic an Prod-DB/Region ausrichten. |
| **M2** | Sentry-DSN | DSN in Env setzen (Code Block 2 legt Paket/Instrumentation an, bleibt ohne DSN inaktiv). |
| **M3** | Branch-Schutz | GitHub: staging → main schützen (P0-6). |
| **M4** | Alte Branches | Veraltete Remote-/Lokal-Branches aufräumen. |
| **M5** | Prod-Migrationen | Index-/RPC-Migrationen nach Staging-Abnahme auf Prod (`wnotlydvhsmfkhexgeol`) anwenden. |
| **M6** | Next 15 | Major-Upgrade + Abnahme (kein Patch in 14.2-Linie). |
| **M7** | AVV | Vorlage korrigieren: Hosting/DB-Region **Irland (`eu-west-1`)**, nicht Frankfurt. |
| **M8** | `data/` | Kundendaten/Verträge aus Repo entfernen oder außer Versionierung halten (nur auflisten, Agent fasst Inhalt nicht an). |
<<<<<<< Updated upstream
| **M10** | `PDF_SERVICE_SECRET` | Gleicher Secret-Wert in **CRM und Portal** Env (Staging + Prod). Portal ruft serverseitig CRM `POST /api/pdf/render` auf; ohne Secret schlägt PDF-Erzeugung fehl. Basis-URL: `NEXT_PUBLIC_CRM_URL` / `CRM_PUBLIC_URL`. |
=======
>>>>>>> Stashed changes

## M8 — Liste `data/` (nicht anfassen, nur Inventar)

| Pfad | Hinweis |
|------|---------|
| `data/historik/Baerenwald_CRM_Umsatz_Leistungsdaten.xlsx` | Umsatz-/Leistungsdaten |
| `data/historik/README.md` | Beschreibung Historik |
| `data/vorschau/Ergänzungsvereinbarung_WDVS_Krumptnerstr_+3000qm.pdf` | Vertragsvorschau |
| `data/vorschau/Nachunternehmervertrag_Vorschau.pdf` | Vertragsvorschau |
| `data/vorschau/Nachunternehmervertrag_WDVS_Krumptnerstr.pdf` | Vertragsvorschau |
| `data/vorschau/Partner-Rahmenvertrag_Rausch_ProjektBAU.pdf` | Partnervertrag |
| `data/vorschau/partner-rausch-insert.sql` | SQL-Seed Partner |

Supabase-Refs (Lesen ok, Schreiben Prod verboten für Agent):

- Prod: `wnotlydvhsmfkhexgeol` · Region `eu-west-1`
- Staging: `soqownnkxmtfgvsbrgsl` · Region `eu-central-1`
