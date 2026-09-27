# Inventur CRM — Was gibt es wirklich?

Repo: **baerenwald-system**. **Nur lesen.** Keine Änderung, kein Commit, kein Branch.

---

## Auftrag: Bestandsaufnahme aus dem Code, nicht aus der Dokumentation

> **Wichtig: Quelle ist ausschließlich der Code.** Nicht `docs/`, nicht `audit-status.mjs`, nicht
> `TODO-ENTWICKLUNG.md`. Diese Dokumente haben sich mehrfach als falsch erwiesen — sie behaupten
> Dinge, die im Code nicht stehen. Wo du eine Behauptung aus der Doku prüfst und sie stimmt nicht,
> gehört das in Abschnitt 8.
>
> **Keine Prüfung im Browser**, kein Dev-Server, kein Login, keine Datenbankverbindung.
> `grep`, Dateien lesen, zählen.
>
> **Format:** Tabellen, Zahlen, Dateipfade. Keine Fließtext-Absätze. Halte dich an die
> Zeilengrenzen je Abschnitt — der Bericht wird als Ganzes weitergegeben und muss lesbar bleiben.

---

### 1 · Module und Screens (max. 30 Zeilen)

Alle Routen unter `src/app/(dashboard)/` auflisten. Je Route: Pfad, was der Nutzer dort tun kann
(ein Halbsatz), und ob es eine Liste, ein Detail, ein Wizard oder eine Einstellung ist.
Unterrouten nur, wenn sie eigene Funktionen haben.

### 2 · Datenmodell, die tragenden Tabellen (max. 25 Zeilen)

Aus `src/types/supabase.ts`: alle Tabellen mit ihrer Spaltenzahl, absteigend sortiert, die ersten
25. Je Tabelle in drei Worten, wofür sie steht. Keine Spaltenlisten.

### 3 · Statuswerte — vollständig (max. 30 Zeilen)

Aus `src/lib/status/`: je Entität (Lead/Anfrage, Angebot, Auftrag, Rechnung, Position,
Handwerker…) die erlaubten Statuswerte als Liste, und daneben das Anzeigewort aus dem
Status-Vokabular.

**Besonders wichtig:** markiere jeden Wert, der
- in mehr als einer Liste vorkommt (wie `angenommen`, das Kunden- **und** Partnerannahme meint),
- in einer Prüfung vorkommt, aber in keiner Schreibliste (wie `beauftragt`).

### 4 · Die vier Hauptabläufe (max. 35 Zeilen)

Für **Anfrage → Angebot → Auftrag → Rechnung** je Übergang:
- welche Funktion ihn auslöst (Datei + Funktionsname)
- welche Statuswerte sich dabei ändern
- ob dabei eine Mail rausgeht, und ob automatisch oder auf Knopfdruck
- ob es einen Sonderweg gibt (Direktauftrag, Notfall, Nachtrag, unter HV-Schwelle)

### 5 · Mails und Benachrichtigungen (max. 25 Zeilen)

Alle Dateien `src/lib/mail/*-mail.ts` und die Auslöser. Je Mail: Empfänger (Kunde, Partner,
intern), Auslöser (Datei/Funktion), und **automatisch oder manuell**. Dazu: welche
Benachrichtigungen es im CRM selbst gibt (Glocke, Push) und woher sie kommen.

### 6 · Rollen und Sichtbarkeit (max. 15 Zeilen)

Welche Rollen kennt das CRM, wo wird darauf geprüft, und was ist rollenabhängig sichtbar oder
gesperrt? Wenn es keine Rollentrennung gibt, schreib das so.

### 7 · Was der Build erzwingt (max. 15 Zeilen)

Alle `scripts/check-*.mjs`: Name, was geprüft wird, ob im Build eingehängt, aktueller Zustand
(grün / rot / mit Grundlinie), und Größe etwaiger Ausnahmelisten.

### 8 · Wo Doku und Code auseinandergehen (max. 20 Zeilen) — **der wichtigste Abschnitt**

Nimm die Aussagen aus `docs/ABSCHLUSS.md`, `docs/TODO-ENTWICKLUNG.md` und `audit-status.mjs`,
die etwas als erledigt oder vorhanden bezeichnen, und prüfe **stichprobenartig im Code**, ob es
stimmt. Melde jede Abweichung: Behauptung, tatsächlicher Befund, Beleg.

Mindestens prüfen:
- „Staging abgenommen" / eingespielte Migrationen — welche Migrationen sind nachweislich im Repo,
  und gibt es irgendeinen Beleg dafür, welche wo eingespielt wurden?
- die als erledigt markierten Punkte, die Zählwerte betreffen (CSS-Größe, Dateien über 1000
  Zeilen, `?? 0` bei Geldbeträgen, `useListUrlState`)

### 9 · Offene Baustellen, gemessen (max. 20 Zeilen)

Zahlen, keine Einschätzungen:
- Dateien über 1000 Zeilen (Anzahl, die fünf größten)
- `logDbError` nach einem Schreibvorgang ohne Abbruch (Anzahl, Top-5-Dateien)
- `useIsMobile` mit Layout-Verzweigung im JSX (Anzahl Dateien)
- Größe von `src/styles/mock-design-system.css` (Zeilen, und roh/gzip wenn ermittelbar)
- `focus-visible`-Regeln, `aria-busy`-Vorkommen
- Spalten-Guard: geprüft / übersprungen / Verstöße
- TODO- und FIXME-Kommentare (Anzahl)

### 10 · Was dich beim Lesen überrascht hat (max. 10 Zeilen)

Freitext, aber knapp: Dinge, die im Code stehen und die niemand erwarten würde. Tote Pfade,
doppelte Implementierungen desselben Zwecks, Felder die nirgends gelesen werden, Funktionen
die nie aufgerufen werden.

---

### Nicht Teil dieses Auftrags

Nichts reparieren. Nichts umbenennen. Keine Datei anlegen außer dem Bericht selbst.
Wenn dir beim Lesen ein Fehler auffällt: in Abschnitt 10 nennen, nicht beheben.

### Ablage

`docs/INVENTUR-CRM-2026-09-26.md` — und den Inhalt zusätzlich vollständig in die Antwort, damit
er weitergegeben werden kann.
