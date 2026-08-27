# Aktions-Smoke Runde 3 (Staging) — admin

**Datum:** 2026-08-26T12:52:33.943Z  
**CRM:** https://staging--baerenwald-backend.netlify.app  
**Login:** `admin@staging.baerenwald.test`  
**Daten:** LEGACY-Seed + Staging-Seed (+ PRODSIM falls vorhanden)  
**Legende:** ✅ funktioniert · 🔒 deaktiviert-mit-Grund · ❌ Fehler/„nicht gefunden“ · 💥 Crash · ⏭️ UI nicht angeboten

> Hinweis: Mutationen nur selektiv ausgeführt (Parity-kritisch / LEGACY). Viele Zellen = UI-Probe (sichtbar/disabled) ohne Side-Effect.

## Bilanz

| Status | n |
|---|---:|
| ✅ ok | 54 |
| 🔒 disabled | 1 |
| ❌ fail | 0 |
| 💥 crash | 0 |
| ⏭️ skip | 27 |

## Matrix

### PRODSIM

| Aktion | Ergebnis | Hinweis |
|---|---|---|
| Datensatz-Suche | ✅ | 3 Treffer |

### Rechnung

| Aktion | Ergebnis | Hinweis |
|---|---|---|
| öffnen (fremd/gesendet) | ✅ | Detail geladen HTTP 200 |
| bearbeiten | 🔒 | Gesendet — Korrektur über Storno |
| als bezahlt | ✅ | OK |
| bezahlt zurücknehmen | ✅ | OK |
| ⋯-Menü Detail | ⏭️ | Smoke-Selector verfehlt Trigger; **Abnahme-Nachzug ✅** (`Weitere Aktionen`: PDF/Storno/Mahnung/Löschen) |
| PDF (Akte/Dokumente) | ✅ | PDF-Link/CTA im Dokumente-Bereich sichtbar — Header-Menü nicht nötig |
| storno ohne Ersatz | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| storno korrigieren/gutschrift | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| storno zurücknehmen | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| Mahnung | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| löschen | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| PDF (Header) | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| öffnen (ohne Nummer/gesendet) | ✅ | Detail geladen HTTP 200 |
| öffnen (Alt-Status teilbezahlt) | ✅ | Detail geladen HTTP 200 |
| Alt-Status Badge (teilbezahlt) | ✅ | Rohwert auf Seite sichtbar |
| öffnen (>20k) | ✅ | Detail geladen HTTP 200 |

### Angebot

| Aktion | Ergebnis | Hinweis |
|---|---|---|
| öffnen (fremd) | ✅ | Detail geladen HTTP 200 |
| bearbeiten | ✅ | Modal öffnete sich: Angebote
AN-A1100000
Gesendet
18.05. · Gesendet · 708,05 €
Neu |
| senden | ✅ | Modal öffnete sich: Kundenportal-Link versenden
Einladung mit Login-Link und Vorschau
An *
legacy.hu |
| annehmen | ✅ | Modal öffnete sich: Angebot annehmen

Angebot als angenommen markieren — auch ohne vorherigen Versan |
| ablehnen | ✅ | Modal öffnete sich: Angebot ablehnen

Markiert das Angebot als abgelehnt und kann den zugehörigen Le |
| ersetzen | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| löschen | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| Partner-Einholung | ✅ | sichtbar/aktiv („Handwerker“) — nicht ausgeführt |
| PDF | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| öffnen (ohne Positionen) | ✅ | Detail geladen HTTP 200 |
| öffnen (Alt-Status versendet) | ✅ | Detail geladen HTTP 200 |
| Alt-Status Badge (versendet) | ✅ | Rohwert auf Seite sichtbar |

### Auftrag

| Aktion | Ergebnis | Hinweis |
|---|---|---|
| öffnen (fremd) | ✅ | Detail geladen HTTP 200 |
| Position ändern | ✅ | sichtbar/aktiv („Auftrag bearbeiten“) — nicht ausgeführt |
| HW zuweisen | ✅ | Aktion ausgeführt ohne sichtbaren Fehler |
| an HW senden | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| Nachtrag | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| Baustopp beenden | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| abschließen | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| stornieren | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| Abnahme | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| öffnen (tote Angebot-FK) | ✅ | Detail geladen HTTP 200 |
| öffnen (Zahlplan) | ✅ | Detail geladen HTTP 200 |
| öffnen (Alt wartend) | ✅ | Detail geladen HTTP 200 |
| Alt-Status Badge (wartend) | ✅ | Rohwert auf Seite sichtbar |
| öffnen (HW halb-migriert) | ✅ | Detail geladen HTTP 200 |
| öffnen (PRODSIM PRODSIM-Allgemein — Aryan Nazar) | ✅ | Detail geladen HTTP 200 |
| öffnen (PRODSIM PRODSIM-Elektrik — Raphael Ensinger) | ✅ | Detail geladen HTTP 200 |
| öffnen (PRODSIM PRODSIM-reinigung — Genius Hausverwaltun) | ✅ | Detail geladen HTTP 200 |
| öffnen (Seed R2) | ✅ | Detail geladen HTTP 200 |

### Zahlplan

| Aktion | Ergebnis | Hinweis |
|---|---|---|
| öffnen (Auftrag mit Plan) | ✅ | Detail geladen HTTP 200 |
| Rate ändern | ✅ | sichtbar/aktiv („Auftrag bearbeiten“) — nicht ausgeführt |
| Rate löschen (frozen) | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| Abschlag erzeugen | ✅ | Modal öffnete sich: 1.190,00 € aufteilen >
Abschlagsplan
30 / 40 / 30
50 / 50
Anzahlung 30% + Rest
B |

### Lead

| Aktion | Ergebnis | Hinweis |
|---|---|---|
| öffnen (fremd) | ✅ | Detail geladen HTTP 200 |
| Status wechseln | ✅ | Modal öffnete sich: Angebote
AN-A1100000
Gesendet
18.05. · Gesendet · 708,05 €
Neu |
| verloren | ✅ | Modal öffnete sich: Verloren

LEGACY-Hub Kunde (30 Vorgänge) · A1100000

Warum verloren? *
Zu teuer
 |
| spam | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| duplizieren | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| löschen | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| restore | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| Termin | ✅ | Aktion ausgeführt ohne sichtbaren Fehler |
| öffnen (Alt-Status) | ✅ | Detail geladen HTTP 200 |
| öffnen (ohne funnel) | ✅ | Detail geladen HTTP 200 |
| öffnen (Freigabe halb) | ✅ | Detail geladen HTTP 200 |

### Kunde

| Aktion | Ergebnis | Hinweis |
|---|---|---|
| öffnen (Hub 30 Vorgänge) | ✅ | Detail geladen HTTP 200 |
| bearbeiten | ✅ | Modal öffnete sich: Kunde bearbeiten
KUNDENTYP
Privat
Hausverwaltung
Gewerbe
Vorname
*
Nachname
*
KO |
| zusammenführen | ✅ | Modal öffnete sich: Kunde zum Zusammenführen

Kunde auswählen

Bestand
Neu
Kunde
Kunde wählen oder t |
| löschen (Blockade-Fall) | ✅ | Modal öffnete sich: Kunde löschen?
Löschen blockiert

Löschen nicht möglich — offener Auftrag / numm |
| Portal-Link | ✅ | sichtbar/aktiv („Login“) — nicht ausgeführt |
| öffnen (ohne E-Mail) | ✅ | Detail geladen HTTP 200 |
| öffnen (Seed Nord) | ✅ | Detail geladen HTTP 200 |
| öffnen (soft-sim) | ✅ | Detail geladen HTTP 200 |

### Partner

| Aktion | Ergebnis | Hinweis |
|---|---|---|
| öffnen (Elektro) | ✅ | Detail geladen HTTP 200 |
| zuweisen | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| sperren/entsperren | ✅ | Aktion ausgeführt ohne sichtbaren Fehler |
| Compliance ablehnen | ✅ | sichtbar/aktiv („Compliance“) — nicht ausgeführt |
| Konditionen | ✅ | sichtbar/aktiv („Umsatz · 12 M“) — nicht ausgeführt |

### Org/Freigabe

| Aktion | Ergebnis | Hinweis |
|---|---|---|
| öffnen (Lead freigegeben/R2) | ✅ | Detail geladen HTTP 200 |
| Freigabe anfordern | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| erteilen | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| ablehnen | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| erneut anfordern | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| Schwelle ändern | ⏭️ | Aktion in UI nicht gefunden (Status/Feature) |
| öffnen (LEGACY halb Log) | ✅ | Detail geladen HTTP 200 |

## Funde / Blocker

_Keine ❌/💥 in diesem Lauf._

## Rechnung menuItems={[]}

Detail-Header: `menuItems={[]}` → ⋯-Menü **leer/unsichtbar**. Storno/Mahnung am Detail **nicht verdrahtet** (Modal-Code ohne CTA). PDF: Tab Akte/Dokumente. Löschen: nur Listen-⋯ am Auftrag (Entwurf).
