# Portal-Umbau: Auftrag abschließen → Abnahme (wie CRM leer/erkannt)

Repo: **handwerks-plattform** (Handwerker-Portal).  
Alte Checkliste / Abnahme-UI beim Klick auf **Auftrag abschließen** entfernen und durch diesen Flow ersetzen.

CRM-Referenz (Datenmodell, nicht 1:1 alte Portal-UI):
- Types: `baerenwald-crm-dashboard/src/lib/auftraege/abnahme-protokoll-types.ts`
- Actions: `…/abnahmeprotokoll-actions.ts` (`saveAbnahmeprotokollPdfOnly`, `saveAndSendAbnahmeprotokoll`, …)
- Tabelle: `auftrag_abnahmeprotokolle` (`punkte`, `maengel`, `meta`, `pdf_url`, `an_kunde_gesendet_at`)

---

## Ziel-Flow (End-to-End)

```
Handwerker: Auftrag abschließen
  → Sheet: Abgeschlossene Leistungen + Mängel
  → Kunde signiert (vor Ort / Kunden-Link)
  → CRM: Abnahmeprotokoll + PDF wird erstellt
  → Handwerker sieht Protokoll auf dem Handy
  → Bestätigen  ODER  Versenden (an Kunden)
```

---

## 1) CTA „Auftrag abschließen“ — neuer Screen (nicht alte Checkliste)

Beim Tap auf **Auftrag abschließen** öffnet sich ein mobiles Sheet/Full-Screen mit **zwei Blöcken** untereinander (kein klassisches Gewerk-Checklisten-Abhaken mehr).

### Block A — Abgeschlossene Leistungen

Header: **Abgeschlossene Leistungen**  
Button: **Hinzufügen** → Wahl:

| Option | Bedeutung | Verhalten |
|--------|-----------|-----------|
| **Leer** | Freie neue Leistung | Leere Karte: Titel + Beschreibung editierbar, Speichern → Zeile in der Liste |
| **Erkannt** | Aus zugewiesenen Leistungen | Picker nur Leistungen mit `handwerker_id = aktueller Partner` (nicht entfernt). Auswahl → Titel = `leistung_name` vorausgefüllt, Beschreibung optional leer oder aus Positions-Text. User kann Text noch editieren und bestätigt **Hinzufügen**. |

Liste der hinzugefügten Karten:
- Titel (editierbar)
- Beschreibung (editierbar, darf leer bleiben)
- Entfernen möglich, solange noch nicht signiert
- Intern: `status: 'ok'` (abgenommen), `leistung_id` wenn aus Auftrag übernommen

Mehrfach hinzufügen erlaubt. Mindestens **eine** abgeschlossene Leistung vor Signatur-Schritt.

### Block B — Mängel (darunter)

Header: **Mängel**  
Button: **Hinzufügen** → Karte:
- Titel / Kurztext (Pflicht)
- Beschreibung (optional)
- optional Foto, optional Frist

Liste darunter, Entfernen bis Signatur.  
Leere Mängelliste = Abnahme ohne Vorbehalt (trotzdem möglich).

### Optional darunter
- Datum Abnahme (Default: heute)
- Kurze Notiz intern (nicht kundensichtbar, wenn so gewollt)
- CTA: **Zur Kunden-Signatur** (nicht sofort PDF finalisieren)

---

## 2) Kunden-Signatur → CRM-Dokument

Nach Handwerker-Eingabe:
1. Kunde signiert (Pad / Link MeinBärenwald — bestehender oder neuer Signatur-Schritt).
2. Portal/Webhook übergibt Payload an CRM (Service-Role oder Internal-API).

### Payload (Minimal)

```ts
{
  auftragId: string
  handwerkerId: string
  abnahme_datum: string // YYYY-MM-DD
  punkte: Array<{
    id: string
    gewerk?: string
    leistung_id?: string | null
    leistung_name: string
    beschreibung: string   // darf ''
    status: 'ok'           // abgeschlossene Leistungen
    foto_urls?: string[]
  }>
  maengel: Array<{
    punkt_id: string       // oder eigene id, CRM mappt
    beschreibung: string   // Titel + Beschreibung kombiniert oder nur Beschreibung
    foto_urls?: string[]
    frist?: string | null
    status: 'offen'
  }>
  meta: {
    // echte Signatur: Ort/Datum + optional Signatur-Bild-URL
    unterschrift_ort_datum_an: string
    unterschrift_ort_datum_ag: string
    abnahme_ergebnis: 'abgenommen' | 'mit_vorbehalt' // mit_vorbehalt wenn maengel.length > 0
    // optional: signature_kunde_url
  }
  notizen?: string | null
}
```

### CRM-Seite (nach Signatur)

1. Upsert `auftrag_abnahmeprotokolle` (`punkte`, `maengel`, `meta`, `abnahme_datum`)
2. Mängel aus Punkten ableiten / sync `punch_list` (wie CRM `sync-abnahme-punch-list`)
3. PDF erzeugen → `pdf_url`, `auftraege.abnahme_protokoll_url`
4. Timeline `abnahmeprotokoll_erstellt`, `fuer_kunde_freigegeben` je Policy
5. Auftrag-Status: sinnvoll `abnahme` oder `abgeschlossen` (mit offenen Mängeln eher `abnahme` / Vorbehalt)
6. Partner-Notification: **„Abnahmeprotokoll bereit — bitte bestätigen“**  
   Deep-Link: `/partner?section=vorgaenge&id={auftragId}&focus=abnahme&protokoll={id}`

**Wichtig:** Das finale Abnahme**dokument** entsteht **erst nach Kunden-Signatur**, nicht schon beim Ausfüllen durch den Handwerker (Entwurf optional lokal/als Draft-Row mit Flag `entwurf` möglich).

---

## 3) Handwerker nach Signatur: Bestätigen / Versenden

Sobald Protokoll + PDF existieren, sieht der Handwerker auf dem Handy den Vorgang mit Fokus Abnahme:

- PDF-Vorschau / Link
- Kurz: Anzahl Leistungen, Anzahl Mängel, Datum
- Zwei Primary-Actions (Footer, wie CRM Dual-CTA):

| Button | Aktion |
|--------|--------|
| **Bestätigen** | Nur Partner-Bestätigung: `meta.handwerker_bestaetigt_at = now()`, optional Status-Flag. **Kein** Mail-Versand. Notification/CRM-Audit. |
| **Versenden** | Bestätigen **und** Protokoll an Kunden mailen (`saveAndSendAbnahmeprotokoll` bzw. Portal-Äquivalent): setzt `an_kunde_gesendet_at`, Mail-Typ `abnahmeprotokoll`. |

Nach einer der beiden Aktionen: Buttons disabled / Badge „Bestätigt“ bzw. „Versendet am …“.

Wenn schon versendet: nur Anzeige, kein erneutes Versenden ohne CRM-Override.

---

## 4) Mapping auf bestehende CRM-Typen

```ts
// Abgeschlossene Leistung → AbnahmePunkt
{
  id, gewerk, leistung_id, leistung_name,
  beschreibung,      // Text oder ''
  status: 'ok',
  notizen?: [],
  foto_urls?: []
}

// Mangel → AbnahmeMangel (+ ggf. Punkt status 'mangel' wenn ihr Punkte spiegeln wollt)
{
  punkt_id,
  beschreibung,      // Titel + Beschreibung
  foto_urls?,
  frist?,
  status: 'offen',
  erfasst_at: ISO
}
```

Tabelle: `auftrag_abnahmeprotokolle`  
Spalten: `punkte` jsonb, `maengel` jsonb, `meta` jsonb, `pdf_url`, `an_kunde_gesendet_at`, `protokoll_typ` (`erstabnahme` …)

Für Handwerker-Bestätigung: `meta.handwerker_bestaetigt_at` (+ ggf. `handwerker_bestaetigt_von`) — Feld im Portal/CRM neu setzen, falls noch nicht vorhanden.

---

## 5) UX-Regeln (mobil)

- Eine Scroll-Seite, zwei klare Blöcke (Leistungen, dann Mängel) — kein 7-Step-Wizard.
- „Hinzufügen“ öffnet Bottom-Sheet: **Leer** | **Erkannt** (nur Block A).
- Erkannt-Picker: nur zugewiesene Positionen dieses Handwerkers; bereits hinzugefügte `leistung_id` ausgrauen.
- Mängel: immer **Leer**-Karte (Titel + Beschreibung), kein Pflicht-Picker.
- Sticky Footer: zur Signatur / später Bestätigen | Versenden.
- Optional: gleicher **KI korrigieren**-Button wie beim Bautagebuch (Beschreibung Felder).

---

## 6) Altes Portal entfernen

- [ ] Alte Checkliste / Abnahme-Dokument-UI am CTA „Auftrag abschließen“ raus
- [ ] Neuer Sheet Leistungen (Leer/Erkannt) + Mängel
- [ ] Signatur-Gate → CRM Persist + PDF
- [ ] Notify Handwerker → Screen mit PDF
- [ ] Buttons **Bestätigen** und **Versenden**
- [ ] Kein Doppel-Abschluss ohne Signatur

---

## 7) API-Skizze Portal

```
POST /api/partner/abnahme/entwurf          // optional: speichern vor Signatur
POST /api/partner/abnahme/nach-signatur    // → CRM create protokoll + PDF + notify HW
POST /api/partner/abnahme/bestaetigen      // nur bestätigen
POST /api/partner/abnahme/versenden        // bestätigen + Mail Kunde
GET  /api/partner/abnahme/{auftragId}      // Status, pdf_url, flags
```

Leistungen-Quelle: `auftrag_positionen` where `handwerker_id = me` und nicht entfernt.

---

## Abgrenzung

- CRM-Staff kann weiterhin eigenes Abschließen/Abnahme nutzen; Portal-Flow ist der Partner-Pfad.
- Offene Mängel bleiben nach Bestätigung im CRM-Mängel-Flow (`/abnahme/maengel`) bearbeitbar.
- Kundenportal zeigt Protokoll nach Versand bzw. nach Freigabe-Policy (`an_kunde_gesendet_at` / Timeline).
