# FIX 5 · Portal — Mandantentrennung prüfen

Repo: **baerenwald**. **Nur lesen.** Keine Änderung, kein Commit, kein Branch.

> **Keine Prüfung im Browser**, kein Dev-Server, kein Login, keine Datenbankverbindung.
> `grep`, Dateien lesen. Am Ende anhalten.

## Befund aus der Inventur

- 236 RLS-Policies in der Datenbank, jede Kerntabelle abgedeckt
- **190 Dateien** im Portal arbeiten mit `supabaseAdmin` — der Service-Role-Schlüssel hebt RLS auf
- `check-service-role-gate` prüft nur, ob **irgendwo in derselben Datei** ein Gate-Wort vorkommt

Der Guard ist eine Anwesenheitsprüfung, keine Berechtigungsprüfung. Er stellt nicht fest, ob das
Gate **vor** der Abfrage läuft, ob es gegen die **richtige** Organisation prüft, oder ob **jeder**
Pfad in der Datei abgedeckt ist.

Dieser Auftrag behebt nichts. Er beantwortet die Frage, ob dort ein echtes Problem liegt.

## Aufgabe

1. **Alle Routen unter `src/app/api/org/` (51), `src/app/api/portal/` (8) und
   `src/app/api/partner/` (4+)** durchgehen. Je Route eine Zeile:

   | Route | Methode | Gate-Funktion | läuft vor der ersten Abfrage? | prüft Zugehörigkeit gegen? |
   |---|---|---|---|---|

   Bei „prüft Zugehörigkeit gegen" geht es um die entscheidende Frage: wird der aus der Anfrage
   kommende Bezeichner (Org-Id, Objekt-Id, Vorgangs-Id, Positions-Id) **gegen die Sitzung**
   geprüft, oder wird er ungeprüft in die Abfrage gegeben? Eine Route, die
   `?objektId=…` entgegennimmt und damit ohne Abgleich in `supabaseAdmin` geht, liefert fremde
   Daten aus.

2. **Dieselbe Prüfung für Server-Actions**, die mit `supabaseAdmin` arbeiten und einen
   Bezeichner vom Client entgegennehmen. Liste sie mit derselben Tabelle.

3. **Drei Befundklassen**, jede Zeile bekommt genau eine:
   - **sicher** — Gate läuft vorher und prüft die Zugehörigkeit
   - **unklar** — Gate vorhanden, Zugehörigkeitsprüfung nicht erkennbar
   - **offen** — kein Gate vor der Abfrage, oder Bezeichner ungeprüft übernommen

4. **Nichts ändern.** Auch nicht „nebenbei", auch nicht wenn etwas offensichtlich aussieht. Eine
   Änderung an einer Zugriffsprüfung gehört nicht in einen Leseauftrag — falsch repariert sperrt
   sie echte Nutzer aus oder öffnet mehr, als sie schließt.

5. Wenn du eine Stelle der Klasse **offen** findest: sie in den Bericht, an den Anfang,
   mit Datei, Zeile und dem konkreten Weg, auf dem fremde Daten herauskämen. Keine Beispiel-URL
   bauen, keine Abfrage ausführen.

## Ergebnis

Eine Tabelle über alle geprüften Routen und Actions, sortiert: **offen** zuerst, dann **unklar**,
dann **sicher** (die dürfen zusammengefasst werden — Anzahl genügt, wenn eine ganze Gruppe
denselben Gate-Aufbau hat).

Dazu drei Zahlen am Anfang: geprüft / unklar / offen.

Ablage: `docs/MANDANTENTRENNUNG-PRUEFUNG-2026-09-26.md`, Inhalt zusätzlich vollständig in die
Antwort.
