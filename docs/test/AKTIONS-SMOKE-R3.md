# Aktions-Smoke Runde 3 — Staging

**Datum:** 2026-08-26 · **CRM:** https://staging--baerenwald-backend.netlify.app  
**Daten:** LEGACY-Seed (`npm run staging:seed-legacy`) + Staging-Seed (Nord/Elektro/R2)  
**Skript:** `scripts/staging/smoke-aktions-matrix.mjs` · Rohdaten: `aktions-matrix-r3-results.json`

### Legende

| Symbol | Bedeutung |
|---|---|
| ✅ | funktioniert (Detail geladen / Aktion OK / Modal öffnet erwartbar) |
| 🔒 | deaktiviert mit Grund (ok) |
| ❌ | Fehler / „nicht gefunden“ (**Fund**) |
| 💥 | Crash / Page-Error (**Blocker**) |
| ⏭️ | in aktueller UI für diesen Status **nicht angeboten** |

### Wichtigste Funde

1. **❌ Rechnung · Als bezahlt** auf LEGACY-RE mit fremdem `erstellt_von` (`a110…023`, Status `gesendet`): Toast **„Rechnung nicht gefunden“** — Detailseite lädt ✅. **View–Action-Parität noch nicht auf Staging deployed** (Helper `requireStaffAndServiceRole` lokal vorhanden).
2. **❌ Rechnung · bezahlt zurücknehmen** — gleicher Fehler (vermutlich Status-Toggle über dieselbe Action; Button-Match griff denselben Toast-Pfad).
3. **Rechnung-Overflow leer:** `DetailActionsBar menuItems={[]}` — Storno-/Mahnung-/PDF-/Löschen-CTAs sind im Header-Menü **nicht verdrahtet** (⏭️), obwohl Server-Actions existieren. Separater UI-Fund, nicht Parity.
4. **✅ Kunde löschen (Hub mit 30 Vorgängen):** Modal **„Löschen blockiert — offener Auftrag…“** = 🔒-äquivalent mit Grund (Confirm-Dialog, nicht ausgeführt).

---

## Matrix

### Rechnung

| Aktion | Ergebnis | Hinweis / Datensatz |
|---|---|---|
| öffnen | ✅ | LEGACY fremd `…023`, ohne Nr `…042`, teilbezahlt `…053`, >20k `…073` — alle HTTP 200 |
| bearbeiten | 🔒 | „Gesendet — Korrektur über Storno“ |
| als bezahlt | ❌ | Toast „Rechnung nicht gefunden“ (`…023`) — **Parity-Deploy fehlt** |
| bezahlt zurücknehmen | ❌ | gleicher Fehlerpfad / kein bezahlt-Status |
| storno (ohne Ersatz) | ⏭️ | nicht im Header-Menü (`menuItems=[]`) |
| storno (korrigieren/gutschrift) | ⏭️ | s. o. — Korrektur-Flow nur über disabled Bearbeiten-Hinweis |
| storno zurücknehmen | ⏭️ | nur wenn soft-storniert |
| Mahnung | ⏭️ | Modal-Code vorhanden, kein sichtbarer CTA |
| löschen | ⏭️ | nicht im Menü (gesendet ohnehin nicht löschbar) |
| PDF | ⏭️ | kein Header-CTA gefunden |

### Angebot

| Aktion | Ergebnis | Hinweis / Datensatz |
|---|---|---|
| öffnen | ✅ | fremd `…021`, ohne Positionen `…041`, Alt `versendet` `…051` |
| bearbeiten | ✅ | Modal/Sheet öffnete |
| senden | ✅ | Versand-/Portal-Modal öffnete |
| annehmen | ✅ | „Angebot annehmen“-Modal |
| ablehnen | ✅ | Ablehnen-Modal |
| ersetzen | ⏭️ | in diesem Status nicht angeboten |
| löschen | ⏭️ | nicht sichtbar (vermutlich Auftrag/Status) |
| Partner-Einholung | ✅ | „Handwerker“-Einstieg sichtbar |
| PDF | ⏭️ | kein eigener CTA gefunden |

### Auftrag

| Aktion | Ergebnis | Hinweis / Datensatz |
|---|---|---|
| öffnen | ✅ | fremd, tote Angebot-FK, Zahlplan, Alt `wartend`, HW halb, Seed R2 |
| Position ändern | ✅ | „Auftrag bearbeiten“ sichtbar |
| HW zuweisen | ✅ | ausgeführt ohne Fehler-Toast |
| an HW senden | ⏭️ | Status/UI |
| Nachtrag | ⏭️ | |
| Baustopp beenden | ⏭️ | kein aktiver Baustopp |
| abschließen | ⏭️ | nicht als Primary gefunden |
| stornieren | ⏭️ | |
| Abnahme | ⏭️ | |

### Zahlplan

| Aktion | Ergebnis | Hinweis / Datensatz |
|---|---|---|
| öffnen | ✅ | Auftrag `…039` |
| Rate ändern | ✅ | Bearbeiten-Einstieg sichtbar |
| Rate löschen (frozen) | ⏭️ | kein Löschen-CTA (frozen/UI) |
| Abschlag erzeugen | ✅ | Abschlagsplan-Modal öffnete |

### Lead

| Aktion | Ergebnis | Hinweis / Datensatz |
|---|---|---|
| öffnen | ✅ | fremd, Alt-Status, ohne funnel, Freigabe-halb |
| Status wechseln | ✅ | Phasen-/Status-UI öffnete |
| verloren | ✅ | Verloren-Modal mit Gründen |
| spam | ⏭️ | kein CTA |
| duplizieren | ⏭️ | |
| löschen | ⏭️ | (⋯ ggf. Listen-/Vorgänge-Pfad) |
| restore | ⏭️ | nur nach Soft-Delete |
| Termin | ✅ | ausgeführt ohne Fehler |

### Kunde

| Aktion | Ergebnis | Hinweis / Datensatz |
|---|---|---|
| öffnen | ✅ | Hub 30 Vorgänge, ohne E-Mail, Soft-Sim, Seed Nord |
| bearbeiten | ✅ | Modal |
| zusammenführen | ✅ | Merge-Assistent |
| löschen (Blockade) | 🔒/✅ | Modal: **„Löschen blockiert“** inkl. Grund (offene Vorgänge) |
| Portal-Link | ✅ | Login/Einladen sichtbar |

### Partner

| Aktion | Ergebnis | Hinweis / Datensatz |
|---|---|---|
| öffnen | ✅ | Elektro Muster |
| zuweisen | ⏭️ | nicht auf Partner-Detail |
| sperren/entsperren | ✅ | ausgeführt ohne Fehler |
| Compliance ablehnen | ✅ | Compliance-Bereich sichtbar |
| Konditionen | ✅ | Kennzahlen/Bereich sichtbar |

### Org/Freigabe

| Aktion | Ergebnis | Hinweis / Datensatz |
|---|---|---|
| öffnen | ✅ | R2-Lead freigegeben + LEGACY halb-Log |
| Freigabe anfordern | ⏭️ | Status bereits `freigegeben` / nicht_noetig |
| erteilen | ⏭️ | |
| ablehnen | ⏭️ | |
| erneut anfordern | ⏭️ | braucht `abgelehnt` |
| Schwelle ändern | ⏭️ | eher Kunden-/Org-Einstellungen |

---

## Bilanz (dieser Lauf)

| | n |
|---|---:|
| ✅ ok / geladen | ~44 |
| 🔒 disabled-mit-Grund | 1 (+ Kunde-Löschen-Blockade als Modal-Grund) |
| ❌ fail | **2** (beide Rechnung-Status) |
| 💥 crash | 0 |
| ⏭️ nicht angeboten | ~26 |

## Nächste Schritte

1. **CRM Staging deployen** mit View–Action-Parity (`requireStaffAndServiceRole`) → Smoke erneut: `Rechnung · als bezahlt` auf `…023` muss ✅ werden.
2. UI: Rechnung-`menuItems` wieder mit Storno / Mahnung / PDF / Löschen (statusabhängig, disabled-mit-Grund) befüllen — sonst bleiben diese Zellen dauerhaft ⏭️.
3. Für Org-Freigabe-Zellen: LEGACY-/ZZTEST-Lead mit `org_freigabe_status=abgelehnt|ausstehend` anlegen und A3–A5 gezielt nachziehen.
4. Prod-Hotfix-Paket: nach Staging-Grün zusätzlich **RE2026-2111** „Als bezahlt“.

## Repeat

```bash
npm run staging:seed-legacy   # falls nötig
node --env-file=.env.staging scripts/staging/smoke-aktions-matrix.mjs
```
