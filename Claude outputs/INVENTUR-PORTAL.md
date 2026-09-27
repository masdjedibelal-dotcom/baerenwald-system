# Inventur Portal + Website — Was gibt es wirklich?

Repo: **baerenwald**. **Nur lesen.** Keine Änderung, kein Commit, kein Branch.

---

## Auftrag: Bestandsaufnahme aus dem Code, nicht aus der Dokumentation

> **Wichtig: Quelle ist ausschließlich der Code.** Nicht `docs/`, nicht `audit-status.mjs`.
> Wo eine Behauptung aus der Doku im Code keine Deckung hat, gehört das in Abschnitt 8.
>
> **Keine Prüfung im Browser**, kein Dev-Server, kein Login, keine Datenbankverbindung.
> `grep`, Dateien lesen, zählen.
>
> **Format:** Tabellen, Zahlen, Dateipfade. Kein Fließtext. Zeilengrenzen einhalten — der Bericht
> wird als Ganzes weitergegeben.

---

### 1 · Die Apps in diesem Repo (max. 15 Zeilen)

Dieses Repo enthält mehrere Dinge gleichzeitig: öffentliche Website, Melde-Funnel, Portale.
Liste je Bereich: Routenpräfix, Zweck, und ob es eigenes Design hat oder das Portal-Design nutzt.

### 2 · Die Portal-Rollen (max. 25 Zeilen)

Welche Portalrollen gibt es (Kunde privat, Hausverwaltung, Eigentümer, Mieter, Hausmeister,
Partner/Handwerker, …)? Je Rolle:
- Einstiegspunkt und Hauptkomponente
- welche Navigationspunkte sie sieht
- was sie **tun** kann (nicht nur sehen): melden, freigeben, ablehnen, hochladen, abrechnen …
- ob es White-Label gibt (HV-Branding) und wo das greift

### 3 · Was der Kunde über einen Vorgang sieht (max. 20 Zeilen)

Ein Vorgang durchläuft Anfrage → Angebot → Auftrag → Rechnung. Für jede Stufe: was sieht der
Kunde im Portal, was kann er dort tun, und was bleibt ihm verborgen?

**Ausdrücklich prüfen:** sieht der Kunde Regie- beziehungsweise Nacharbeitspositionen? Wenn nein,
sag das klar — es ist eine wichtige Lücke und keine Kleinigkeit.

### 4 · Was der Handwerker sieht und tut (max. 20 Zeilen)

Dieselbe Frage für das Partnerportal: Auftragsannahme, Zeiterfassung, Regie melden, Fotos,
Bautagebuch, Abrechnung, Dokumente. Je Punkt: Komponente und ob schreibend oder nur lesend.

### 5 · Datenzugang und Trennung (max. 20 Zeilen)

- Wie kommt das Portal an Daten? Direkte Supabase-Abfragen, eigene API-Routen, oder Aufrufe ins CRM?
- Wo liegt die Zugriffstrennung — RLS in der Datenbank, Prüfung im Code, oder beides?
- Wo wird der Service-Role-Schlüssel benutzt (Anzahl Stellen, Dateien)? Jede solche Stelle
  umgeht RLS.
- Welche Dateien kommen über `shared-domain` aus dem CRM (Anzahl, Liste)?

### 6 · Mails und Benachrichtigungen aus dem Portal (max. 15 Zeilen)

Verschickt das Portal selbst Mails, oder ruft es dafür das CRM? Welche Benachrichtigungen sieht
ein Portalnutzer (Glocke, Push, Badge), und woher kommen sie?

### 7 · Was der Build erzwingt (max. 15 Zeilen)

Alle `scripts/check-*.mjs`: Name, was geprüft wird, ob im Build eingehängt, aktueller Zustand,
Größe der Ausnahmelisten. **Und ausdrücklich:** welcher Guard kann sich selbst überspringen, wenn
eine Voraussetzung fehlt (Suchbegriffe: `übersprungen`, `skip`, `sibling`, `baerenwald-system`)?

### 8 · Wo Doku und Code auseinandergehen (max. 15 Zeilen)

Aussagen aus `docs/` stichprobenartig gegen den Code prüfen, jede Abweichung mit Beleg melden.

### 9 · Zustand des Designsystems, gemessen (max. 20 Zeilen)

Zahlen aus `src/app/globals.css` und den Tokens:
- Zeilen gesamt; verschiedene `border-radius`-Rohwerte; Schreibweisen für Pille
- verschiedene `box-shadow`-Definitionen, davon über Token
- rohe Hex-Farben; `var(--…, Rückfallwert)`-Vorkommen
- `focus-visible`-Regeln; `outline: none`; `aria-busy`
- Abstands-Tokens vorhanden (ja/nein), und wie viele verschiedene `gap`-Werte benutzt werden
- unlayered Regeln außerhalb von `@layer components` (Anzahl)
- `PortalButton`-Verwendungen gesamt, davon mit `action={false}`

### 10 · Offene Baustellen, gemessen (max. 15 Zeilen)

- Dateien über 1000 Zeilen (Anzahl, die fünf größten)
- `useIsMobile` bzw. `matchMedia` mit Layout-Verzweigung (Anzahl)
- Spalten-Guard: geprüft / übersprungen / Verstöße
- `logDbError` nach Schreibvorgang ohne Abbruch (Anzahl)
- TODO- und FIXME-Kommentare (Anzahl)

### 11 · Was dich beim Lesen überrascht hat (max. 10 Zeilen)

Tote Pfade, doppelte Implementierungen desselben Zwecks, Komponenten ohne Aufrufstelle, Felder
die nirgends gelesen werden.

---

### Nicht Teil dieses Auftrags

Nichts reparieren, nichts umbenennen, keine Datei anlegen außer dem Bericht.
Auffälligkeiten gehören in Abschnitt 11, nicht in einen Fix.

### Ablage

`docs/INVENTUR-PORTAL-2026-09-26.md` — und den Inhalt zusätzlich vollständig in die Antwort.
