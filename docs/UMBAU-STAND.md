# Umbau-Stand

Einstieg für jede Umbau-Sitzung. Plan und Pakete: Claude Doc „Bärenwald Fachkonzept“, Tab **Umbauplan**
(https://claude.ai/code/artifact/484818f3-d8fb-44c2-a45d-592f38d84734). Abnahmen: `docs/UMBAU-ABNAHME.md`.

## Regeln

- Ein Paket = eine Sitzung = Branch `umbau/pNN-name` in den betroffenen Repos (CRM `baerenwald-system`, Portal `baerenwald`).
- Test auf Staging: Branch in `staging` mergen → Netlify baut `staging--…` → Belal nimmt ab → erst dann `main`.
- Commit, Push und Prod-Migration nur nach Freigabe von Belal. Prod-DB sonst nur lesend (`scripts/audit/db-readonly.mjs`).
- Migrationen liegen im CRM unter `supabase/migrations/`. Neue Spalte → auch in `src/types/supabase.ts` (CRM), dann `node scripts/sync-shared-domain.mjs` (kopiert ins Portal).
- Fremde, nicht committete Änderungen im CRM (Cursor-Docs, `RechnungDetailClient.tsx`, `src/lib/copy/toast.ts`) nicht anfassen und nicht mit committen.

## Prüfwerkzeuge

- `TARGET=prod node scripts/audit/schema-snapshot.mjs` → danach `TARGET=prod python3 scripts/audit/code-vs-schema.py`: Abfragen im Code gegen das echte Schema.
- Portal: `node scripts/check-db-spalten.mjs` (Grundlinie `scripts/db-spalten-baseline.txt`, Maximum im Skript). CRM: `node scripts/check-db-spalten.mjs` (noch nicht im Build, kommt mit P03).
- `npx tsc --noEmit` in beiden Repos.

## Stand

| Paket | Status | Branch | Notiz |
|---|---|---|---|
| P01 Kundenportal vollständig | fertig, in Abnahme | `umbau/p01-kundenportal` | Migration `20261212120000_…` |
| P02 Partner-Portal vollständig | fertig, in Abnahme | `umbau/p02-partnerportal` (Portal) | Portal-Spaltenprüfung 0/0 |
| P03 CRM vollständig | fertig, in Abnahme | `umbau/p03-crm` | Migration `20261212130000_…`; CRM-Prüfung im Build, 29 Streichlisten-Ausnahmen |
| P04 Nichts hängt | fertig, in Abnahme | `umbau/p04-nichts-haengt` | `src/lib/actions/safe-action.ts` in beiden Repos |
| P05 Liste und Auftrag | fertig, in Abnahme | `umbau/p05-liste-auftrag` | Block-A-Stand = dieser Branch in beiden Repos |

Branches bauen aufeinander auf: `umbau/p05-liste-auftrag` enthält P01–P05. Lokale Builds beider Apps: grün (29.09.2026).

| P06 Auftrag erteilen | fertig | `umbau/p06-auftrag-erteilen` (CRM + Portal) | Migration `20261213120000_…`; Portal ruft `POST /api/auftraege/aus-angebot` |
| P07 Rechenkern | fertig | `umbau/p07-rechenkern` (CRM + Portal) | Liste = Detail: `auftragSummenAusPositionen` |
| P08 Rechnung nach Versand | fertig | `umbau/p08-rechnung-versand` (CRM) | Storno immer mit Gutschrift, kein Zurücknehmen |
| P09 Abschlag/Schluss | fertig | `umbau/p09-abschlag-schluss` (CRM) | `AbschlagStellenSheet`, `planMitNeuemAbschlag` |
| P10 Angebots-Versionen | fertig | `umbau/p10-angebot-versionen` (CRM) | `angebotWarBeimKunden` in wizard-actions |

| P11 Einsatz CRM | fertig | `umbau/p11-einsatz-crm` | Migration `20261214120000_…`; `AuftragEinsaetzeCard` |
| P12 Einsatz Portal | fertig | `umbau/p13-regie-mitteilung` (Portal) | `PartnerEinsaetzeSection`, `write-einsatz-status` |
| P13 Regie/Behinderung | fertig | `umbau/p13-regie-mitteilung` | Migration `20261214130000_…`; Aufschlag 20 % vorbelegt (Rückfrage) |
| P15 (Teil) Glocke Einsätze | fertig | `umbau/p13-regie-mitteilung` (CRM) | `collectEinsatzItems` |
| P14 (Texte) | fertig | `umbau/p14-status-texte` | nur Labels; Daten-Umschlüsselung offen |
| P16/P17 (Einstiege) | fertig | `umbau/p16-einstiege-raus` (CRM) | Code/Tabellen noch da |
| P19/P25 (Teil) Details | fertig | `umbau/p19-sheets` (CRM) | Sheet-Fuß, Preisfeld, Speichern-Frage, Handy-Kopf, Tab-Hinweis |

| P21 Nächster Schritt | fertig | `umbau/p21-naechster-schritt` | Karte + Betrag im Kopf |
| P24 Texte | fertig | `umbau/p24-texte` (CRM + Portal) | Sie überall (Website bleibt du), Toasts nur Unsichtbares |
| P25 Handy | fertig | `umbau/p25-handy` | Kurzlabels, 44 px, kein FAB auf Detailseiten |
| P23 Assistent (Angebot) | fertig | `umbau/p23-assistent` | Schritte + Prüfen-Sheet mit PDF; Rechnung offen |
| Eine Wahrheit „offen“ + Klick-Fixes | fertig | `umbau/wahrheiten-offen` | `src/lib/vorgang/vorgang-offen.ts`; verlorene CSS aus `b3ef4c563` zurück |
| Entlastung | fertig | `umbau/entlastung` | Auswahl Belal 30.09. (Memory `entlastung-streichungen`) |

| Block A+B | fertig | `umbau/ab-schlank` (CRM + Portal) | Aktionsmodell, Status aus status-map, Dashboard aus Rechnungen, Phasenleiste |
| Flow-Vereinfachung 1–4 | fertig | `umbau/ab-schlank` | P18, Rechnung ohne Korrektur-Modus, Direktauftrag=Angebot, Tagebuch, HV ein Zustand |

Staging: CRM = `umbau/staging-j`, Portal = `umbau/staging-j` (per „ours“-Merge, kein Force).
Nächstes: Design-Fundament (Tokens, 3 Oberflächen, Build-Prüfung) — Entscheidungen im Memory `flow-vereinfachung`/`aktionsmodell`.

## Nächste Sitzungen

1. Abnahme Block A–C und Block D (Teil) durch Belal auf Staging.
2. P14 Daten (35 → 17 Status) mit Probelauf auf Kopie, dann Prod mit Backup.
3. P15 Ereignis-Protokoll + ein Mail-Weg.
4. Löschen (Code + Tabellen) nach Backup, P18 alte Partner-Positionsansicht.
5. P22 Vorgang als eine Seite; Rechnungs-Assistent in 3 Schritten.
6. Wahrheiten weiter zusammenführen: Dashboard-Funnel/Umsatz, rohe Status-Texte (z. B. „wartend“), Zeitangaben („vor 12h“), Portal auf verlorene CSS-Regeln prüfen.

## (alt) Nächstes Paket: P11 Einsatz im CRM (Block B2)

Entschieden: Einsatz = Anweisung (Titel, Text, wann, wo) + EK je Partner (netto/brutto wegen §13b); Partner nimmt an/lehnt ab,
meldet in einem Schritt fertig (Fotos, Dokumente, Text), dann Rechnung mit Freitext-Positionen. Auftrag „läuft“ wird aus Einsätzen abgeleitet.

## (alt) P06 Auftrag erteilen

Erst nach Abnahme von Block A. Einstieg: `createAuftragFromAngebot` (CRM `src/app/(dashboard)/angebote/actions.ts`) und
`acceptKundeAngebot` (Portal `src/app/actions/portal-angebot.ts`) → eine Datenbank-Funktion.

## Bekannte Stolperstellen

- `staging`-Branches beider Repos stehen seit 26.08.2026 auf einem toten Seitenzweig (191/50 Konflikte zu main). Test-Stand wird per Reset auf den Block-Branch gesetzt, alter Stand als `staging-backup-2026-09-29`.
- Staging-Storage: 6 Buckets fehlten, am 29.09. angelegt.

- Staging hinkte Prod um 3 Migrationen hinterher; am 29.09. nachgezogen (`lead_dokumente`, `stundensatz_kunde`, `auftrag_partner_aufgaben`). Vor jeder Abnahme Schema-Snapshot beider Ziele vergleichen.
- Portal-Build hat die Prüfung „keine Hex-Farben im Code“: Farben für Bibliotheken (QR, PDF) über `PALETTE` in `src/lib/tokens/palette.ts`, nie `var(--…)`.
