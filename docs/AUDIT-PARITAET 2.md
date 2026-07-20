# Audit Parität — Befund ohne Code-Änderungen

**Erstellt:** 2026-07-16  
**Geprüftes Repo (kanonisch):** `/Users/belalmasdjedi/code/baerenwald-system`  
**Methode:** Shell-Befehle, `git`-Historie, Datei-/Zeilenstichproben im Working Tree. Keine Fixes in diesem Durchlauf.

---

## 1. Standort & Stand

### 1.1 Kanonisches Repo (`~/code/baerenwald-system`)

```text
PWD=/Users/belalmasdjedi/code/baerenwald-system

origin  https://github.com/masdjedibelal-dotcom/baerenwald-system.git (fetch)
origin  https://github.com/masdjedibelal-dotcom/baerenwald-system.git (push)

BRANCH=main

9110c1a fix: Netlify-Build — mock-ui Barrel + fehlende Exports
79593e6 v
4c56293 v
9915af7 v
6694929 v
2467555 v
e8c19c1 v
bfa4bec v
2d7602d v
69f01fb v
9170ba1 v
ce00ead v
fe33bf2 v
5c64220 v
d6879b7 v
8c75605 v
fd07704 v
e97bd90 v
3d385a6 v
955ddbb v
4516990 v
9974145 v
850e339 v
```

**Branch-Status:** `main` ist **1 Commit vor** `origin/main` (`9110c1a`), nicht gepusht.

**Uncommitted (Working Tree, nicht Teil von HEAD):**

| Datei | Inhalt |
|-------|--------|
| `src/app/(dashboard)/layout.tsx` | Datenschutz-Hinweis-Abfrage entfernt |
| `src/components/layout/DashboardProviders.tsx` | `DatenschutzHintModal` ausgehängt |
| `tsconfig.tsbuildinfo` | Build-Artefakt |
| `.env.local` | untracked (vom Desktop kopiert für lokalen Dev) |

### 1.2 Arbeitsauftrags-Commits und `fa0f59d` — auf DIESEM Branch?

| Objekt | Auf `main` @ HEAD? | Anmerkung |
|--------|-------------------|-----------|
| `fa0f59d` (*Bring CRM shell and design tokens to mockup parity.*) | **Nein** | `git cat-file -t fa0f59d` → *Not a valid object name* in diesem Clone |
| `2354904` Nr. 1 — Listen Welle 1 | **Nein** | Commit existiert hier nicht |
| `820e802` Nr. 2 — Listen Welle 2 | **Nein** | — |
| `b666442` Nr. 3 — WizardShell-Optik | **Nein** | — |
| `3d880b0` Nr. 4 — P0 Status-Sync | **Nein** | — |
| `2556e71` Nr. 5 — P0 Kanal-Fix | **Nein** | — |
| `b4b466e`–`3d8cbc3` Nr. 7a–7d Impersonation | **Nein** | — |
| `22bb160` Nr. 8a — `/rechnungen/neu` Redirect-Race | **Nein (nicht Vorfahr)** | Nur als **verwaister Commit** in `git reflog` / `git log --all` |
| `9c72799` Nr. 11/Abschluss | **Nein (nicht Vorfahr)** | Ebenfalls verwaist |

**Reflog-Beweis (Reset auf `origin/main` hat Nr.-Commits vom Branch abgeschnitten):**

```text
9110c1a HEAD@{0}: commit: fix: Netlify-Build — mock-ui Barrel + fehlende Exports
79593e6 HEAD@{1}: reset: moving to origin/main
9c72799 HEAD@{3}: commit: Nr. 11/Abschluss — Abschlussbericht + Offene Punkte nach iCloud-Umzug
22bb160 HEAD@{4}: commit: Nr. 8a — /rechnungen/neu: Redirect-Race + Standalone-Edit
```

`git merge-base --is-ancestor 22bb160 HEAD` → Exit **1** (nicht enthalten).  
`git merge-base --is-ancestor 9c72799 HEAD` → Exit **1**.

**Fazit zu Commits:** Die benannten Nr.-Commits und `fa0f59d` sind **nicht** auf `main` in `~/code`. Viel Paritäts-**Code** liegt dennoch im Working Tree (über squash-Commits `v`, v. a. `79593e6`), aber **ohne** die dokumentierte Commit-Kette.

**Git-Katastrophe im Verlauf:** Commit `4c56293` hatte **kein `src/`** im Git-Baum (`git ls-tree 4c56293 src` → leer). `79593e6` stellte `src/` wieder her.

### 1.3 Weitere Repo-Kopien auf dem Rechner

| Pfad | Rolle | Git-HEAD | Nr.-Commits / `fa0f59d` |
|------|-------|----------|---------------------------|
| `/Users/belalmasdjedi/code/baerenwald-system` | **Kanonisch / Dev-Server** | `9110c1a` | Keine Nr.-Messages auf Branch; `fa0f59d` fehlt |
| `/Users/belalmasdjedi/Desktop/Bärenwald-Backend/baerenwald-crm-dashboard` | iCloud-Desktop-Kopie | `008fb9e` | **Vollständig:** `fa0f59d` + Nr. 1–7d; vs. `origin/main`: **338 ahead / 15 behind** |
| `/Users/belalmasdjedi/Desktop/Bärenwald-Backend` | Parent-Ordner | `78e45b5` (*Initial commit*) | Kein CRM-Quellcode versioniert |

Desktop-CRM (`008fb9e`):

```text
008fb9e fix: Netlify-Build — mock-ui Barrel + fehlende Exports
3d8cbc3 Nr. 7d — Admin Login verdrahten + Token-Tabelle live
…
2354904 Nr. 1 — Listen Welle 1 (L1–L9) + DetailShell-Vorarbeit
fa0f59d Bring CRM shell and design tokens to mockup parity.
```

### 1.4 Dev-Server `localhost:3000`

```text
COMMAND   PID     USER   PORT
node      17544   belalmasdjedi   *:3000 (LISTEN)

Prozess: next-server (v14.2.35)
CWD:     /Users/belalmasdjedi/code/baerenwald-system
```

**Antwort:** `localhost:3000` wird aus **`~/code/baerenwald-system`**, Branch **`main` @ `9110c1a`**, plus uncommitted Datenschutz-Entfernung bedient — **nicht** aus dem Desktop-Ordner und **nicht** aus einem Branch mit Nr.-Commit-Messages.

---

## 2. Artefakte-Check

| Artefakt | Vorhanden? | Fortschritt / Inhalt |
|----------|------------|----------------------|
| `docs/ENTSCHEIDUNGSLOG.md` | **Ja** (git-tracked, eingeführt in `4c56293`) | Dokumentiert **Vorarbeit, Nr. 1–5, Nr. 7a/7c/7d, Nr. 8a** — endet Zeile 119, **kein Nr. 9–11** |
| `docs/OFFENE-PUNKTE.md` | **Ja** (git-tracked) | **OP-1 bis OP-5** (Nr. 1/2/9b, L10) — kein Abschluss-Block |
| `docs/paritaet/` | **Ja** | **Screenshots:** `nr1-listen/` (6 PNG), `nr2-listen/` (6 PNG), `nr3-wizards/` (1 PNG + README). **Kein** `nr4`–`nr11` |
| `docs/ABSCHLUSSBERICHT.md` | **Nein auf Branch** | Nur Inhalt in **verwaistem** Commit `9c72799` (`git show 9c72799:docs/ABSCHLUSSBERICHT.md` lesbar), nicht in `HEAD` |

**Desktop-Kopie:** gleiche `paritaet`-Screenshots vorhanden; `ABSCHLUSSBERICHT.md` dort ebenfalls **nicht** als Datei im Working Tree (nur in dangling `9c72799` im `~/code`-Reflog).

Der autonome Lauf hat **Teil-Artefakte** erzeugt (Log, Offene Punkte, Parität-Screenshots 1–3), aber **keinen** vollständigen Abschluss auf dem aktiven Branch und **keine** Parität-Doku für Nr. 4–11.

---

## 3. Code-Beweis pro Paritäts-Punkt

Alle Belege beziehen sich auf den **laufenden Stand** in `~/code/baerenwald-system` (Working Tree).

### (a) Mock-Tokens in `globals.css` / `tailwind.config.ts`

| Stichprobe | Befund | Beleg |
|------------|--------|-------|
| `--r: 13px` | **Vorhanden** | `src/app/globals.css` Z. 38 |
| Border `rgba(0,0,0,0.08)` | **Vorhanden** (`--border`) | `src/app/globals.css` Z. 19 |
| Badge `11.5px` | **Vorhanden** (u. a. `--app-text-xs`, `.badge`) | `src/app/globals.css` Z. 110, Z. 558 |
| Button `32px` / Radius `9px` | **Vorhanden** (`.btn`) | `src/app/globals.css` Z. 661–670 |
| Tailwind spiegelt Mock-`:root` | **Vorhanden** | `tailwind.config.ts` Z. 14–16, Z. 39 (`bw-border` → `--border`) |

### (b) Icon-Map & Sidebar/Detail-Nav

| Punkt | Befund | Beleg |
|-------|--------|-------|
| Icon-Map-Datei | **Vorhanden** `src/lib/mock-icons.ts` (`ICON_MAP`, Z. 101+) | `MockIcon.tsx` Z. 6–7, 44 |
| Sidebar nutzt Map | **Ja** — `MockIcon` + `iconName` aus Nav | `Sidebar.tsx` Z. 9–10, Z. 101; `nav-config.ts` Z. 3, Z. 29 |
| Detail-Nav nutzt Map | **Ja** in `DetailShell` | `DetailShell.tsx` Z. 43 (`MockIcon n={gr.icon}`) |
| Fallback-Icons | **Teilweise Legacy-Lucide** direkt (nicht über Map), z. B. Anfragen-Liste `Inbox`, `Sparkles` | `AnfragenListeClient.tsx` Z. 5; `SortableHeader` nutzt Lucide-Chevrons (`SortableHeader.tsx`) |
| Unbekannte Mock-Namen | **Bewusst kein generischer Fallback** | `mock-icons.ts` Z. 98–99 |

### (c) Icon-Farb-Token-Binding

| Punkt | Befund | Beleg |
|-------|--------|-------|
| CSS-Tokens `--icon-*` | **Vorhanden** | `globals.css` Z. 56–66 |
| `.mock-icon` Binding | **Vorhanden** | `globals.css` Z. 3274–3281; `MockIcon.tsx` Z. 51 (`className … mock-icon`) |

### (d) `.dshell` / Detail-Nav in Auftrag **und** Anfrage/Angebot

| Entity | `DetailShell` eingebunden? | Beleg |
|--------|---------------------------|-------|
| Auftrag | **Ja** | `AuftragDetailClient.tsx` Z. 1114–1118 |
| Angebot | **Ja** | `AngebotDetailPageClient.tsx` Z. 895–899 |
| Anfrage | **Ja** | `AnfrageDetailClient.tsx` Z. 844–848 |
| CSS `.dshell-nav` | **Vorhanden** | `globals.css` Z. 3537–3606 |

Hinweis: Klasse heißt `dshell-nav` / `dshell-navitem`, nicht `dshell-Detail-Nav`.

### (e) Listen: Mock-Spalten, Toolbar/Chiprow, listcard

| Punkt | Befund | Beleg |
|-------|--------|-------|
| Grid-Templates | **Ja** (Beispiel Anfragen) | `AnfragenListeClient.tsx` Z. 61 (`ANFRAGEN_GRID_COLS`), Z. 485, Z. 521 |
| `.toolbar` + `.chiprow` | **Ja** (Wrapper um `ListFilterBar`) | `ListPageParts.tsx` Z. 65–67 |
| `.listcard` 13px / 0.5px | **Ja** | `globals.css` Z. 3393–3398 (`border-radius: var(--r)`, `border: 0.5px`); `ListGridShell` Z. 85 |
| Reine Mock-Listenzeile | **Nein überall** — weiter `ListFilterBar`, `SortableHeader`, `LeadStatusBadge`, `AppEntityListRow` | siehe Abschnitt (g) |

`/vorgaenge` ist die **Mock-reifste** Liste (`MockSortHead`, `MockChip`, `listcard` direkt): `VorgaengeListeClient.tsx` Z. 477, Z. 507–524.

### (f) Rechnungen-Liste im Mock-System?

| Punkt | Befund | Beleg |
|-------|--------|-------|
| Master-Detail-Shell | **Ja** | `rechnungen/layout.tsx` → `RechnungenMasterDetailShell` |
| Mock-Grid + listcard | **Teilweise** — `ListGridShell` + `list-row-grid`, aber **`SortableHeader` (Lucide)**, **`ListFilterBar`** | `RechnungenListeClient.tsx` Z. 289–362, Z. 412–424 |
| Dedizierte Mock-only-Liste wie `/vorgaenge` | **Nein** | — |

### (g) Alt-Komponenten-Inventur (noch eingebunden)

Aus `docs/LISTEN-KOMPONENTEN-INVENTUR.md` plus Stichprobe im Code:

| Alt-/Nicht-Mock-Komponente | Verwendungsort (Beispiel) |
|----------------------------|---------------------------|
| `ListFilterBar` | `AnfragenListeClient.tsx` Z. 23, Z. 380; alle Entity-Listen (`rechnungen`, `kunden`, `angebote`, …) |
| `SortableHeader` (Lucide) | `AnfragenListeClient.tsx` Z. 14; `RechnungenListeClient.tsx` Z. 414+ |
| `LeadStatusBadge` / `ui/Badge` | `AnfragenListeClient.tsx` Z. 15; `KundeDetailClient.tsx` Z. 21 |
| `PageHeader` | `AnfragenListeClient.tsx` Z. 6; viele Listen-Seiten |
| `EntityListShell` / `AppEntityListRow` | `AnfragenListeClient.tsx` Z. 12 |
| `ListAvatar` | `AnfragenListeClient.tsx` Z. 21 |
| `ListRowQuickActions` | `AnfragenListeClient.tsx` Z. 22 |
| `KiHubClient` / `ki-hub/*` | `ki-analytics/page.tsx` Z. 1, Z. 15 |
| Sidebar-Struktur **getrennte** Listen + **KI Hub** | `nav-config.ts` Z. 41–72 (`/anfragen`, `/angebote`, `/auftraege`, `/ki-analytics`) |
| `ListToolbar.tsx` | laut Inventur **verwaist** (0 Produktiv-Imports bestätigt) |
| `Modal` (nicht `MockModal`) | z. B. `AuftragDetailClient.tsx` Z. 1120+ |

### (h) WizardShell-Parität

| Punkt | Befund | Beleg |
|-------|--------|-------|
| `WizardShell.tsx` existiert | **Ja** | `src/components/layout/WizardShell.tsx` Z. 15–16 |
| In Wizards importiert/verwendet | **Nein** — **0 Imports** außer Definition | `rg WizardShell src` → nur `WizardShell.tsx` |
| Angebot/Rechnung-Wizard | Eigene `wizard-header-desktop`-Struktur | `AngebotWizard.tsx` Z. 831 |
| `PosBoard` in Wizards | **Nein** — `PosBoard` nur innerhalb `components/posboard/` referenziert | `rg "from '@/components/posboard"` → nur `PosBoard.tsx` / `PositionModal.tsx` |

**Parität begonnen** (Dateien + CSS), aber **nicht verdrahtet** (WizardShell, PosBoard).

---

## 4. Fazit-Tabelle (Arbeitsauftrag Nr. 1–11)

Legende: **umgesetzt** = im laufenden Code nachweisbar und nutzbar · **teilweise** = Code/Doku existiert, Lücken oder fehlende Verdrahtung · **fehlt** = nicht im Code oder nur verwaist/off-branch

| Nr. | Thema | Status | Beleg (Commit-SHA oder Datei) | Ursache bei Lücke |
|-----|-------|--------|-------------------------------|-------------------|
| **1** | Listen Welle 1 | **teilweise** | Code: `globals.css` 3393–3398, `AnfragenListeClient.tsx` 61/485; Doku: `docs/paritaet/nr1-listen/`; Commit **nur Desktop** `2354904` | Squash-`v`-Historie auf `~/code`; Alt-Filter/Badges bleiben; Nr.-Commit nicht auf Branch |
| **2** | Listen Welle 2 | **teilweise** | `ListPageParts.tsx` 65–67, `ListGridShell` 85; Screenshots `docs/paritaet/nr2-listen/`; Desktop `820e802` | Wie Nr. 1; `ListFilterBar`/`SortableHeader` nicht ersetzt |
| **3** | WizardShell-Optik | **teilweise** | `WizardShell.tsx` vorhanden, **unbenutzt**; Screenshot `nr3-wizards/`; Desktop `b666442` | Shell-Datei ohne Integration in `AngebotWizard`/`RechnungWizard` |
| **4** | P0 Status-Sync CRM→Portal | **umgesetzt** | `sync-portal-lead-status.ts`; Aufruf `auftraege/actions.ts` ~77–80; Desktop `3d880b0` | Commit-Message auf `~/code` fehlt (in `v` squash) |
| **5** | P0 Kanal-Fix | **umgesetzt** | `utils.ts` 130–139 (`kanalLabel`), `KanalIcon.tsx`; Desktop `2556e71` | — |
| **6** | SQL Cleanup | **n/a (Belal)** | `ENTSCHEIDUNGSLOG.md` Z. 80–82 | Bewusst übersprungen |
| **7** | Admin-Impersonation 7a–7d | **teilweise / weitgehend umgesetzt** | `crm-access-server.ts` `requireCrmAdmin`; `impersonation/actions.ts`; `CrmPortalOpenButtons.tsx`; Desktop `b4b466e`–`3d8cbc3` | Code in `~/code`, Historie nur auf Desktop; Portal-Banner im Sibling-Repo |
| **8a** | `/rechnungen/neu` Redirect-Race | **umgesetzt (Code)** | `RechnungWizard.tsx` 546–547, 570–571 (`if (onDone) … else onClose`); `wizard-actions.ts` `loadRechnungWizardBootstrapStandalone`; Commit **`22bb160` verwaist** | Fix im Working Tree, aber Nr.-Commit durch `reset` nicht auf `main` |
| **8b** | PosBoard in Wizards | **fehlt** | `components/posboard/*` existiert, **kein Import** in Angebot/Rechnung-Wizard | Nie verdrahtet oder bei Git-Reset/Ordner-Split verloren |
| **8c** | (PosBoard-Fortsetzung / Wizard-Lücken) | **fehlt** | wie 8b | — |
| **9** | Resolver → Chips → `/vorgaenge` | **teilweise** | `app/(dashboard)/vorgaenge/page.tsx`; `VorgaengeListeClient.tsx` Mock-UI; `pipeline-kontext.ts`; **`PipelineKontextBadge.tsx` ohne Import** | Resolver-UI nur teilweise; Badge nicht eingebunden; Sidebar zeigt weiter Einzellisten statt Mock-„Vorgänge“ |
| **10** | Rest-Fixes HW-Mail + Partner | **teilweise** | `api/handwerker/anfrage/[token]/antwort/route.ts`; Partner-Hint nicht in diesem Audit einzeln verifiziert | Kein Nr.-10-Eintrag in `ENTSCHEIDUNGSLOG` |
| **11** | L10 Mobile + Abschluss | **teilweise / fehlt** | Mobile `.vg-row` in `VorgaengeListeClient`; **kein** `ABSCHLUSSBERICHT.md` auf Branch; OP-2 L10 offen | `9c72799` verwaist; AppEntityListRow in Stammdaten-Listen bleibt |

---

## 5. Warum `localhost` nicht wie die Mock-Shell-Screenshots aussieht

1. **Navigation bewusst CRM-alt, nicht Mock-konsolidiert**  
   `nav-config.ts` Z. 35–39 kommentiert: Mock fasst zu **„Vorgänge“** (`folders`) zusammen; CRM behält **getrennte** Einträge Anfragen / Angebote / Aufträge plus **KI Hub** (`/ki-analytics`, Z. 71). Genau das siehst du in der Sidebar.

2. **Du siehst den `~/code`-Stand, nicht die Desktop-Commit-Kette**  
   Dev-Server-CWD = `~/code/baerenwald-system` @ `9110c1a`. Die **benannten** Paritäts-Commits (`fa0f59d`, Nr. 1–7d) liegen nur auf **Desktop** `008fb9e`, sind aber inhaltlich teils schon über squash-Commits `v` im Code — **ohne** vollständige Verdrahtung (WizardShell, PosBoard, Mock-only-Listen).

3. **Hybride UI-Schicht**  
   Tokens und `DetailShell` sind da; Listen nutzen weiter **`ListFilterBar` + `SortableHeader` + `LeadStatusBadge`** statt durchgängig `MockListBar`/`MockSortHead`. `/vorgaenge` ist die Ausnahme mit Mock-Komponenten.

4. **Git-Reset hat Doku/Abschluss abgeschnitten**  
   `ABSCHLUSSBERICHT` und Commit `9c72799` sind nicht auf `main`; `ENTSCHEIDUNGSLOG` endet bei Nr. 8a.

---

## 6. Vorschlag: Arbeitsstand zurückholen / Neuaufsetzen

### Schritt A — Eine kanonische Historie wiederherstellen

1. **Desktop-Branch als Basis** nehmen: `~/Desktop/…/baerenwald-crm-dashboard` @ `008fb9e` (enthält `fa0f59d` + Nr. 1–7d + Netlify-Fix `008fb9e`).
2. **Verwaiste Commits** aus `~/code` cherry-picken oder per Patch übernehmen: `22bb160` (Nr. 8a Doku + ggf. Diff prüfen), `9c72799` (`ABSCHLUSSBERICHT.md`, erweiterte `OFFENE-PUNKTE`).
3. **`~/code/baerenwald-system`** auf diese vereinheitlichte History setzen (merge oder `reset --hard` nach Backup), dann **`9110c1a`/Netlify-Barrel** vergleichen (Desktop `008fb9e` ist gleicher Fix-Titel, anderer SHA).
4. **Einmal `git push origin main`** — Netlify und lokal müssen dieselbe Quelle sein.

### Schritt B — Ab welcher Nr. der Lauf **inhaltlich** neu ansetzen muss

| Bereich | Empfehlung |
|---------|------------|
| Nr. 1–2 | **Abnahme/Review**, nicht komplett neu — Code weitgehend da; Lücken: Dots-Menü (OP-1), Lucide-Sort, `ListFilterBar`-Ersetzung optional |
| Nr. 3 | **Nachverdrahtung** — `WizardShell` in `AngebotWizard`/`RechnungWizard` einbinden |
| Nr. 4–5, 7 | **Prüfen + testen** — Code vorhanden |
| Nr. 8a | **Commit auf Branch holen** (`22bb160` oder Diff bestätigen — Code bereits im Tree) |
| **Nr. 8b–c** | **Neu umsetzen** — PosBoard in Wizards importieren |
| Nr. 9 | **Fortsetzen** — `PipelineKontextBadge` verdrahten; Sidebar-Entscheidung Mock-„Vorgänge“ vs. CRM-Struktur klären |
| Nr. 10 | **Verifizieren** (HW-Mail-Route da; Partner-Hint ggf. Portal) |
| **Nr. 11** | **Neu/fortsetzen** — L10 Mobile-Pane, `ABSCHLUSSBERICHT.md` aus `9c72799` committen |

**Minimaler Neuaufsetz-Punkt für den autonomen Lauf:** **Nr. 8b** (PosBoard-Verdrahtung), sofern Schritt A die Historie konsolidiert hat. Wenn Schritt A scheitert (Desktop iCloud dataless): **ab Nr. 1** gegen `~/code` mit Gap-Analyse aus `9c72799`-Abschlussbericht.

### Schritt C — Prozess

- **Nur `~/code/baerenwald-system`** als Arbeits- und Deploy-Root; Desktop aus iCloud **„Download Now“** oder archivieren.
- Jede Nr. = **ein Commit mit Message** `Nr. X — …`; keine anonymen `v`-Squashes mehr.
- Parität-Screenshots nach jedem Block unter `docs/paritaet/nrX-…/` committen.

---

*Ende des Audits — keine Code- oder Config-Änderungen in diesem Durchlauf.*
