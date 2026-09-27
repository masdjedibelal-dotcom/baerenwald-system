# FIX 6 · Portal — Die sieben offenen Zugriffslücken schließen

Repo: **baerenwald**. Eigener Branch. **Vier Commits** in der Reihenfolge unten, nach jedem anhalten.

> **Keine Prüfung im Browser**, kein Dev-Server, kein Login, keine Datenbankverbindung, **kein
> Ausnutzen der Lücken zum Testen**. Nachweis nur über Codelesen, `grep`, `npx tsc --noEmit`.

## Grundsatz für alles Folgende

Eine Sitzung zu haben ist **nicht** dasselbe wie berechtigt zu sein. Jede Kennung, die vom Client
kommt — `objektId`, `einheitId`, `id`, `paths`, `protokollId`, `email` — muss **gegen die Sitzung
aufgelöst** werden, bevor sie in eine Abfrage geht. `supabaseAdmin` hebt RLS auf; es gibt keine
zweite Linie darunter.

**Vorsicht bei Sicherheitskorrekturen:** falsch gesetzt sperren sie echte Nutzer aus. Wo du
unsicher bist, welche Bindung fachlich richtig ist, **anhalten und fragen** statt enger zu raten.

---

### Commit 1 — Die zwei ohne jede Anmeldung (zuerst, alles andere wartet)

**1 · `getPartnerBautagebuchFotoUrls(paths)`** — `src/app/actions/partner-bautagebuch.ts` L300

Heute: nimmt beliebige Pfade, gibt signierte URLs zurück, **ohne Sitzung**. Jeder, der die App
erreicht, kann Baustellenfotos fremder Kunden lesen.

- Partner-Sitzung erzwingen (`requireAccountSession` + `kind === "handwerker"`, wie in den
  übrigen Partner-Actions).
- Zusätzlich jeden Pfad gegen den eigenen Betrieb binden: die Pfade müssen dem Präfix des
  angemeldeten `handwerker_id` entsprechen bzw. zu einem Eintrag gehören, der diesem Betrieb
  zugeordnet ist. **Präfixprüfung allein reicht nicht**, wenn Pfade erratbar sind — prüfe gegen
  den Datensatz, zu dem die Datei gehört.
- Pfade, die nicht bestehen, werden stillschweigend ausgelassen; kein Hinweis darauf, dass es sie
  gibt.

**2 · `acceptPartnerRahmenvertragForEmail({ email, akzeptiert })`** — `src/app/actions/partner-vertrag.ts` L127

Heute: akzeptiert einen Rahmenvertrag allein anhand einer übergebenen Mailadresse. Jeder kann im
Namen eines fremden Betriebs zustimmen. Das ist eine rechtlich erhebliche Erklärung.

Diese Action liegt vermutlich in der Registrierung, wo der Partner noch nicht angemeldet ist —
eine reine Sitzungsprüfung würde den Ablauf zerstören. **Prüfe zuerst, von wo sie aufgerufen
wird**, und wähle danach:
- Aufruf aus einem eingeloggten Bereich → Sitzung erzwingen, `email` aus der Sitzung nehmen statt
  aus dem Aufruf.
- Aufruf aus einem Einladungs- oder Bestätigungslink → an ein einmaliges, ablaufendes Token
  binden, das schon existiert (das Portal hat Einladungs-Token, siehe `portal-einladungen-server`),
  und die Mailadresse aus dem Token ziehen, nicht aus dem Aufruf.
- Keins von beidem eindeutig → **anhalten und fragen.** Nicht raten.

In jedem Fall: die Zustimmung wird mit Zeitpunkt und Herkunft protokolliert.

**Anhalten.** Commit: `fix(portal): Partner-Actions ohne Anmeldung abgesichert`

---

### Commit 2 — Fremde Kennungen bei angemeldeten Org-Nutzern

**3 · `GET /api/org/hausmeister?objektId=…`** — `src/app/api/org/hausmeister/route.ts` L23

`requireOrganisationSession` läuft, aber `objektId` geht ungeprüft weiter. Nutze
`assertOrgObjekt` (existiert bereits und wird anderswo verwendet), bevor
`loadHausmeisterForObjekt` aufgerufen wird.

**4 · `POST /api/org/katalog/bestellen`, Feld `einheitId`** — L53

Das Objekt wird korrekt gegen `kunde_id` geprüft, die `einheitId` nicht. Ergänze eine Prüfung,
dass die Einheit zu **diesem** Objekt gehört — nicht nur zur Organisation, sondern zu dem Objekt,
das in derselben Bestellung steht.

**5 · `DELETE /api/org/objekte/einheiten?id=…`** — L178

Das `PATCH` in derselben Datei hat `assertOrgEinheit`, das `DELETE` nicht. Denselben Assert
ergänzen. Prüfe beim Durchgehen, ob es weitere Methoden in derselben Datei ohne Assert gibt.

**Anhalten.** Commit: `fix(portal): Org-Routen binden Kennungen an die Sitzung`

---

### Commit 3 — Partner-Routen mit fremden Kennungen

**6 · `POST /api/partner/signed-urls`** — L9

Partner ist angemeldet, aber `paths[]` wird ungeprüft signiert. Dieselbe Bindung wie in Punkt 1 —
und wenn beide dieselbe Auflösung brauchen, **eine gemeinsame Funktion** dafür, nicht zweimal
geschrieben.

**7 · `GET /api/partner/abnahme/[auftragId]?protokoll=…`** — `partner-abnahmeprotokoll.ts` L500

`assertPartnerAktiveZuweisung(auftragId)` läuft, aber die optionale `protokollId` wird mit
`.eq("id", …)` ohne Bindung an `auftrag_id` oder `handwerker_id` geladen. Die Abfrage zusätzlich
an den bereits geprüften `auftragId` binden.

**Anhalten.** Commit: `fix(portal): Partner-Routen binden Kennungen an den eigenen Betrieb`

---

### Commit 4 — Die fünf unklaren Fälle klären und der Guard

8. Die fünf als **unklar** eingestuften Stellen einzeln durchgehen und je eine Zeile in den
   Bericht: sicher (mit Begründung) oder doch offen (dann wie oben beheben). Betroffen:
   `GET /api/org/einheit-bewohner`, `POST /api/portal/ki-assist` (`hm_befund_notiz`), die beiden
   Abnahme-Routen mit `protokollId`, und die CRM-seitige `protokoll_id`-Bindung.
   Bei `ki-assist` `hm_befund_notiz` fehlt laut Prüfung jeder Rollen- und Org-Bezug — das sieht
   nach einem achten offenen Fall aus, nicht nach unklar.

9. **Guard `scripts/check-action-gates.mjs`.** Der bestehende `check-service-role-gate` prüft nur,
   ob ein Gate-Wort irgendwo in der Datei vorkommt. Das hätte keinen dieser sieben Fälle gefunden.
   Der neue Guard prüft enger und bricht ab bei:
   - einer exportierten Server-Action in `src/app/actions/`, deren erste Anweisung **keine**
     Sitzungs- oder Assert-Funktion aufruft;
   - einem Route-Handler unter `src/app/api/`, in dem ein Wert aus `searchParams`, `params` oder
     `await req.json()` in eine `supabaseAdmin`-Abfrage fließt, ohne dass zwischen Entnahme und
     Abfrage eine `assert*`-Funktion steht (Heuristik über die Zeilenreihenfolge in derselben
     Funktion).
   Fehlalarme sind hier schlimmer als Lücken, weil der Guard sonst abgeschaltet wird: im Zweifel
   überspringen und zählen. Bewusste Ausnahmen (öffentliche Endpunkte wie `meldung`,
   `ki-rechner`, ICS-Token) auf eine Liste mit Begründung, die nicht wachsen darf.

10. In die Guard-Kette vor `npm run build`.

**Anhalten.** Commit: `feat(portal): Guard gegen ungebundene Kennungen in Actions und Routen`

---

## Abnahme

- Keine exportierte Server-Action in `src/app/actions/` ohne Sitzungsprüfung als erste Anweisung
  (Ausnahmen begründet auf der Liste)
- Für jede der sieben Stellen im Bericht: die konkrete Bindung, gegen die jetzt geprüft wird
- Die fünf unklaren Fälle sind entschieden, keiner bleibt „unklar"
- Der neue Guard schlägt an, wenn man testweise eine Action ohne Gate anlegt
- `npx tsc --noEmit` grün, Guard-Kette grün

## Bericht

Je Fall: Datei, welche Bindung ergänzt wurde, und ob dabei ein bestehender Ablauf eingeschränkt
wird, der vorher funktioniert hat. Der letzte Punkt ist wichtig — bei Nummer 2 kann das die
Partner-Registrierung betreffen.
