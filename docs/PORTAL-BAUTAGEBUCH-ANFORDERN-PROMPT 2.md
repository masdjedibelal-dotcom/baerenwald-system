# Portal-Umbau: Bautagebuch anfordern + KI-Korrektur

Repo: **handwerks-plattform** (nicht baerenwald-crm-dashboard).  
CRM-Seite ist fertig: Anfordern-Sheet, `partner_bautagebuch_anfragen` (+ `position_ids`), E-Mail + `notifyPartnerUnified` (Typ `erinnerung`), Deep-Link-Parameter.

## 1) Notification „Bitte Update geben“

CRM sendet bereits:

```
POST /api/internal/partner-notify
{
  typ: "erinnerung",
  leistungName: "Bitte Update geben — Bautagebuch",
  link: "/partner?section=vorgaenge&id={auftragId}&focus=bautagebuch&anfrage={anfrageId}",
  auftragId,
  positionIds?: string[]
}
```

**Portal muss:**

1. `partner-notify` Route: Notification in `hv_notifications` speichern mit Titel **„Bitte Update geben“**, Body = Projektname, Link wie oben.
2. Glocke: Klick → `link` öffnen.
3. Query-Params auswerten:
   - `focus=bautagebuch` → Vorgang öffnen und Bautagebuch-/Lebenszyklus-Eingabe zeigen
   - `anfrage={uuid}` → offene Zeile aus `partner_bautagebuch_anfragen` laden (`position_ids`, `notiz`)
4. Leistungen aus `position_ids` vorauswählen; Textfeld mit optionaler CRM-Notiz vorbelegen.
5. Nach erfolgreichem `position_eintraege`-Insert: `partner_bautagebuch_anfragen.erledigt_at = now()`.

Shared Contract: `position_eintraege` (Typen `weitere_arbeit` / `notiz` / …), Spiegel von CRM `src/lib/auftraege/position-lebenszyklus.ts`.

## 2) Kunden-Sichtbarkeit (ohne Freigabe)

Jedes neue Bautagebuch-/Portal-Update muss **sofort** im MeinBärenwald sichtbar sein:

- Nach Insert von `position_eintraege` (Partner): Timeline-Event schreiben analog CRM-Helper  
  `publishPositionEintragFuerKunde` → `auftrag_timeline` mit `fuer_kunde_freigegeben: true`, `typ: 'bautagebuch'`.
- CRM macht das bereits bei CRM-Nacherfassung.
- Optional: gleicher Helper als shared Package oder SQL-Trigger.

Kundenportal liest weiterhin `auftrag_timeline` where `fuer_kunde_freigegeben = true` (`load-public-projekt.ts`).

## 3) Kontextbezogene KI (Einsprechen / Schreiben / Korrigieren)

Für **Bautagebuch-Eintrag** und **Abnahmeprotokoll** im Partner-Portal:

### UX

- Textfeld + optional Mikrofon (Speech-to-Text, Web Speech API oder bestehender STT-Service).
- Button **„KI korrigieren“** neben Speichern.
- Rohtext bleibt in `beschreibung_roh`; korrigierter Text in `beschreibung`.

### Prompt-Vorlage (System)

```
Du bist Korrektur-Assistent für Handwerker-Dokumentation (Bärenwald).
Kontext: {bautagebuch|abnahmeprotokoll}, Gewerk/Leistung: {…}, Auftrag: {titel}.
Aufgabe: Formuliere den Rohtext klar, sachlich, deutsch, kurz.
- Keine erfundenen Fakten, Mengen, Daten oder Namen.
- Baustellenjargon in verständliche Fachsprache bringen.
- Aufzählungen als kurze Sätze oder Bullet-Punkte.
- Ausgabe: nur der korrigierte Text, ohne Einleitung.
```

### API-Skizze (Portal)

`POST /api/partner/ki-korrigieren`  
Body: `{ scope: 'bautagebuch'|'abnahme', rohtext, kontext: { leistungName?, auftragTitel? } }`  
→ `{ text: string }`

Danach: UI setzt Textfeld auf `text`; beim Speichern beide Felder persistieren.

## 4) Abnahmeprotokoll

Gleiche KI-Fläche im Abnahme-Flow: Einsprechen → KI korrigieren → Speichern.  
Kein CRM-Freigabe-Schritt für Bautagebuch; Abnahme-Status bleibt eigener Workflow.

## 5) Checkliste Portal

- [ ] Notify-Route speichert „Bitte Update geben“ + Deep-Link
- [ ] `focus=bautagebuch&anfrage=` öffnet Eingabe mit vorselektierten Leistungen
- [ ] `erledigt_at` nach Submit
- [ ] Kunden-Timeline Sync bei jedem Partner-BT-Insert
- [ ] KI-Korrigieren-Button + Roh/Final-Felder
- [ ] Optional STT (Mikrofon)

## CRM-Migrationen (anwenden)

- `20260730140000_partner_bautagebuch_anfragen_position_ids.sql`
- (optional) `20260730130000_crm_notification_reads.sql` für CRM-Inbox
