# Cursor-Prompt R1 — Kein toter Screen mehr bei DB-/RPC-Fehlern

Kopiere alles ab der Trennlinie in Cursor. Ein Auftrag = ein Branch = ein Commit.

---

## Auftrag R1: Vorgangsliste und Portal-Detail dürfen bei einem DB-Fehler nicht sterben

**Kontext, nicht diskutieren, sondern umsetzen.** Ein fehlender Datenbank-RPC hat heute im
Livebetrieb zwei Screens komplett getötet: die CRM-Vorgangsliste zeigte den rohen Postgres-Text
`Could not find the function public.crm_vorgaenge_lead_page(...) in the schema cache`, das
Kundenportal hing dauerhaft auf „Vorgang wird geladen…". Ursache war, dass die Migration
`20260919133752_p3_3_crm_vorgaenge_lead_page_pagination.sql` nach dem ersten Apply editiert wurde
(`p_lead_ids` nachträglich ergänzt) und `supabase db push` sie darum nie erneut einspielt. Die
Migration ist bereits repariert (`supabase/migrations/20260920210000_p3_3b_crm_vorgaenge_lead_page_repair.sql`,
nicht anfassen).

Dieser Auftrag behebt **nicht** die Migration, sondern die Bauweise, die aus einem DB-Fehler einen
Totalausfall macht. Es werden keine Entscheidungen von dir erwartet: alles unten ist festgelegt.

### Teil 1 — CRM: Fallback in `src/lib/vorgang/load-vorgaenge-liste.ts`

Aktuell gilt in `loadVorgaengeListeInner` an beiden RPC-Aufrufstellen (ca. Zeile 198 und 219):
bei `error` → `return { rows: [], error: error.message, pagination: null }`. Ein fehlender oder
kaputter RPC beendet damit die gesamte Liste.

1. Ziehe die Ermittlung der Lead-Seite in **eine** lokale Funktion, z. B.
   `async function fetchLeadPage(supabase, { limit, offset, kundeId, objektId, leadIds })`, die
   `{ ids: string[]; total: number; usedFallback: boolean } | { error: string }` zurückgibt.
   Beide Aufrufstellen (`fetchAllPages`-Schleife und Einzelseite) nutzen nur noch diese Funktion.
2. In `fetchLeadPage`: zuerst der RPC `crm_vorgaenge_lead_page` wie bisher.
3. Kommt ein Fehler zurück, **nicht** abbrechen, sondern einmal per `logDbError`
   (`'loadVorgaengeListe:rpc-fallback'`) protokollieren und auf eine Direktabfrage ausweichen,
   die exakt dieselbe Semantik wie der RPC hat:
   - `supabase.from('leads').select('id, updated_at', { count: 'exact' })`
   - `.is('geloescht_am', null)`
   - wenn `kundeId`: `.or(\`kunde_id.eq.${kundeId},auftraggeber_kunde_id.eq.${kundeId}\`)`
   - wenn `objektId`: `.eq('kunde_objekt_id', objektId)`
   - wenn `leadIds` nicht null: `.in('id', leadIds)`
   - `.order('updated_at', { ascending: false, nullsFirst: false })`
   - `.range(offset, offset + limit - 1)`
   `total` kommt aus dem `count` der Antwort. `usedFallback: true` setzen.
   Scheitert auch die Direktabfrage, dann erst `{ error }` zurückgeben.
4. Die Begrenzung der Seitengröße auf 1–100 bleibt wie heute in `loadVorgaengeListeInner`; der
   Fallback darf sie nicht umgehen.
5. Wenn der Fallback gegriffen hat, ergänze das Rückgabeobjekt von `loadVorgaengeListe` um ein
   optionales Feld `degraded?: true`. Kein neues Verhalten daran hängen außer Punkt 7.

### Teil 2 — CRM: verständliche Fehlermeldung statt Postgres-Rohtext

In `src/app/(dashboard)/vorgaenge/page.tsx` wird der DB-Fehlertext heute direkt ins UI gerendert
(zwei Stellen: `error`-Zweig und `catch`-Zweig).

6. Zeige dem Nutzer nur noch Text aus `src/lib/copy/errors` — eine Zeile, was passiert ist, und was
   er tun kann. Kein Funktionsname, keine Signatur, kein `schema cache`. Lege den passenden
   Schlüssel in `src/lib/copy/errors` neu an, wenn keiner passt; Wording im Stil der vorhandenen
   Einträge. Der technische Text geht ausschließlich per `console.error` / `logDbError` in das Log.
7. Ergänze im Fehlerzustand einen Button „Nochmal versuchen", der die Seite neu lädt
   (Client-Komponente oder Link auf denselben Pfad — keine neue Abstraktion). Der bestehende
   Sonderfall „Sitzung abgelaufen" mit Link zur Anmeldung bleibt unverändert.
8. Wenn `degraded` gesetzt ist, aber Zeilen geladen wurden: Liste normal rendern und **einen**
   dezenten Hinweis oberhalb setzen (vorhandene Hinweis-/Badge-Komponente nutzen, nichts Neues
   bauen), Wortlaut: „Eingeschränkte Ansicht — Paginierung läuft im Notbetrieb." Kein Toast, kein
   Modal, keine Blockade der Liste.

### Teil 3 — Portal: kein Endlos-Ladezustand

In `src/components/baerenwald/../portal/PortalClient.tsx` (Datei
`src/components/portal/PortalClient.tsx`), Funktion `applyDetailFromUrl`, steht um Zeile 897:

```
// Unbekannte id: nicht in Endlos-Ladezustand gehen (Filter-/Race-Reste).
if (vorgaengeItems.length > 0) { ... setDetailLoading(false); setSelectedId(null); return; }
```

Weil dieser Ausstieg an `vorgaengeItems.length > 0` hängt, bleibt bei **leerer** Liste — also genau
dann, wenn das Laden vorher gescheitert ist — `setDetailLoading(true)` für immer stehen. Das war der
hängende Screen.

9. Der Ladezustand braucht eine harte Obergrenze. Setze beim Start eines Detail-Fetches einen
   Timeout von 12 Sekunden; läuft er ab, ohne dass der Fetch abgeschlossen ist, `setDetailLoading(false)`
   und in einen Fehlerzustand gehen. Timer beim Abschluss/Abbruch (`finish`, Generationswechsel
   `detailFetchGenRef`, Unmount) zuverlässig aufräumen — kein Leck, kein Timer über Rollenwechsel
   hinweg.
10. Der bereits vorhandene Fehlerzweig („Vorgang konnte nicht geladen werden" / „Zurück zur Liste",
    ca. Zeile 1282) wird dafür genutzt. Ergänze ihn um einen zweiten Button „Nochmal versuchen", der
    denselben Detail-Fetch erneut auslöst. Kein neues Layout, keine neue Komponente.
11. Derselbe Fehlerzustand greift, wenn die Vorgangsliste selbst nicht geladen werden konnte: dann
    nicht „Vorgang wird geladen…" zeigen, sondern den Fehlerzustand. Prüfe, ob der Ladefehler der
    Liste im Portal überhaupt bis in `PortalClient` ankommt; falls nicht, gib ihn als Prop durch,
    ohne die Signatur unnötig zu verbreitern.
12. Prüfe in `HausmeisterPortalClient.tsx` und `EigentuemerPortalClient.tsx`, ob dort die gleiche
    Konstruktion existiert (Busy-Zustand, der nur über eine nicht-leere Liste beendet wird). Falls
    ja, identisch absichern; falls nein, im Bericht ausdrücklich „nicht betroffen" schreiben.

### Teil 4 — Regressionsschutz

13. Ein Playwright-Test pro App, der genau diesen Ausfall nachstellt: Netzwerk-/RPC-Antwort auf
    Fehler mocken (route interception) und prüfen:
    - CRM `/vorgaenge`: Liste rendert Zeilen (Fallback greift) **oder**, wenn auch die Direktabfrage
      gemockt fehlschlägt, es erscheint die Klartext-Fehlermeldung samt „Nochmal versuchen" — und
      nirgends der Text `schema cache` oder `crm_vorgaenge_lead_page` im DOM.
    - Portal-Detail: nach dem Timeout erscheint der Fehlerzustand mit „Nochmal versuchen"; der Text
      „Vorgang wird geladen…" ist nicht mehr sichtbar.
14. Ergänze in `scripts/` einen Guard, der bricht, wenn eine bereits im Repo committete Datei unter
    `supabase/migrations/` inhaltlich verändert wird (Vergleich gegen `git show HEAD:<pfad>`, Liste
    zulässiger Ausnahmen leer). Grund: genau diese Änderung an einer alten Migrationsdatei hat den
    Ausfall verursacht. In `npm run build` / die bestehende Guard-Kette einhängen.

### Abnahme — ohne diese Punkte gilt der Auftrag als offen

- `npx tsc --noEmit` in beiden Repos fehlerfrei, `npm run build` grün.
- Die neuen Playwright-Tests laufen und schlagen bei zurückgedrehtem Fix nachweislich fehl
  (kurz gegenprüfen, nicht nur behaupten).
- Der neue Migrations-Guard schlägt an, wenn man testweise eine alte Migrationsdatei ändert.
- Im UI ist an keiner Stelle mehr ein Postgres-Fehlertext sichtbar.
- Kein neuer Button-, Hinweis- oder Fehlerbaustein außerhalb der Kanon-Komponenten
  (`MockBtn`, `PortalButton`, bestehende Fehler-/Hinweisflächen).

### Bericht

Schreibe am Ende in den Commit-Text und nach `docs/TODO-ENTWICKLUNG.md`:
geänderte Dateien, ob `HausmeisterPortalClient`/`EigentuemerPortalClient` betroffen waren, die
Namen der neuen Tests und des Guards. Keine Status-Häkchen setzen, die `scripts/audit-status.mjs`
nicht selbst messen kann.
