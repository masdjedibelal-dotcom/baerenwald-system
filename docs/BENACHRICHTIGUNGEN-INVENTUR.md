# Benachrichtigungen — Inventur + Ereigniskatalog (Phase A)

**Status:** Phase B Freigabe Belal (N1–N6) — Umsetzung gestartet 2026-09-20.  
**Verwandt:** [DOKUMENTE-MAIL-INVENTUR.md](./DOKUMENTE-MAIL-INVENTUR.md) (Mail-Layout), [COPY-REGELN.md](./COPY-REGELN.md), [MAIL-BETREFF-NACHWEIS.md](./MAIL-BETREFF-NACHWEIS.md).

### Freigabe §7 → verbindlich

| ID | Entscheidung |
|----|----------------|
| **N1** | Telegram nur Staff (Lead-Alert, Copilot); kein Kanal im Katalog für HV/Partner/Kunden |
| **N2** | Partner-Glocke auch bei Auftragsänderungen (Leistungen, Termine, Storno) + Bautagebuch-Anforderungen |
| **N3** | Gemeinsame Tabelle `notifications` (CRM + Portal); Alt-Speicher auslaufen, nicht sofort löschen |
| **N4** | Mieter: keine Mails (`MIETER_EMAIL_ENABLED=false`); Glocke nur mit HV-WL-Konto, sonst Status-Link |
| **N5** | Prefs in 5 Gruppen × {Glocke, Push, Mail}; Defaults aus Katalog |
| **N6** | Staff-Pref „Überfällige Rechnungen“ an Rechnungs-Cron anbinden |

### Migration (Schritt 1)

| Datei | Inhalt |
|-------|--------|
| `supabase/migrations/20261211120000_notifications_kanon.sql` | Partner-Alt → `partner_notifications`; neue `notifications` + RLS |
| `scripts/staging/verify-notifications-kanon.sql` | Staging-Check |

**STOPP** nach Staging-Apply + Verify — Ergebnis an Belal, dann Schritt 2 (`notify()`-Dienst).

---

## Ziel (Phasen B–D)

1. **Ein Dienst je App:** `notify(event, empfänger)` entscheidet In-App / Push / Mail nach Nutzereinstellung.  
2. **Ereigniskatalog** mit Texten aus Copy (`src/lib/copy` / `portal-copy`).  
3. **Glocke:** einheitliche Liste (ungelesen/gelesen, Sprung, „alle gelesen“) — gleiche Komponente CRM + Portal-Rollen.  
4. **Einstellungen:** pro Ereignis Kanal wählen.

---

## 1. Kanal-Inventur

| Kanal | CRM (`baerenwald-system`) | Portal (`baerenwald`) | Empfänger |
|-------|---------------------------|------------------------|-----------|
| **Glocke In-App** | `CrmNotificationsBell` — virtuelle Aggregation (kein `notifications`-Table); Reads in `crm_notification_reads` | 3 Tabellen: `portal_notifications` (Kunde/HM/…), `hv_notifications` (HV), `notifications` (Partner) | staff · kunde · hv · partner · hm |
| **Web Push** | `sendCrmPushToStaff` → `crm_push_subscriptions` + Prefs `crm_push_prefs` | `send-web-push` → `push_subscriptions` + Master `push_prefs.push_enabled` | staff · portal-User · partner |
| **Mail** | Resend `mail-service` / Templates | Resend `send-branded-mail` | kunde · hv · partner · intern |
| **Telegram** | Copilot Bot + Lead-Alert + Briefing (`copilot_alerts` Dedup) | — | staff only |
| **In-App-Banner** | Auftrags-/Freigabe-Banner (zustandsgetrieben) | HV-Freigabe/Meldung, Partner-Onboarding, Admin-View | staff · hv · partner |
| **Toast** | `app-toast` — **kein** Persistenz-Kanal (UX) | `portal-toast` — **kein** Persistenz-Kanal | — |

**Mieter:** E-Mail aus (`MIETER_EMAIL_ENABLED=false`); Status über HV-Glocke (+ optional Status-Link).  
**Eigentümer-Glocke:** Writer bewusst No-op (`notify-portal-eigentuemer`).  
**FCM:** nicht vorhanden — nur PWA Web Push (VAPID).

---

## 2. Glocke — Ist vs. Soll (Phase C)

| | CRM | Portal Kunde/HM | Portal HV | Portal Partner |
|---|-----|-----------------|-----------|----------------|
| **UI** | `CrmNotificationsBell` | `PortalUserNotificationBell` → `PortalNotificationBell` | `HvNotificationBell` | `PartnerNotificationBell` |
| **Storage** | Live-Query ~18 Quellen | `portal_notifications` | `hv_notifications` | `notifications` |
| **Gelesen** | `crm_notification_reads` | `gelesen` / `gelesen_am` | `gelesen_am` | `gelesen` |
| **Alle gelesen** | ja (Batch) | ja | ja | ja |
| **Sprung** | Deep-Link je Typ | Deep-Link | Deep-Link | Deep-Link |
| **Polling** | 3 min | Event | Event | 30s + Event |

**Soll Phase C:** eine Listen-Komponente + Adapter; einheitliche Felder `id, titel, body, gelesen, href, eventId`.

---

## 3. Push-Prefs — Ist

### CRM Staff (`crm_push_prefs`)

| Switch | Label | Glocken-Typen (Mapping) | Verdrahtung Push-Send |
|--------|-------|-------------------------|------------------------|
| `neue_anfragen` | Neue Anfragen | `neue_anfrage`, `hm_befund_freigabe` | ja |
| `handwerker_updates` | Partner-Updates | Annahme/Ablehnung/Update/Einreichung/… | ja |
| `angebot_entscheidungen` | Angebote & Entscheidungen | `angebot_entscheidung`, Vertrag | ja |
| `anstehende_abnahmen` | Anstehende Abnahmen | Abnahme-Typen | teils |
| `auftrag_partner` | Auftrag & Partner | Abschluss, weitere Arbeit | teils |
| `ueberfaellige_rechnungen` | Überfällige Rechnungen | — | **Pref ohne Send-Aufruf** |
| `system_updates` | System-Updates | — | default off |

### Portal

| Setting | Scope | Pro-Ereignis? |
|---------|-------|---------------|
| `push_prefs.push_enabled` | Master on/off + Geräte | **Nein** — nur Master |
| `hv_notification_prefs` | DB-Schema `sofort`/`digest`/`nur_notfall` | **Keine UI, nicht angebunden** |
| E-Mail je Event | — | hardcoded Policy |
| In-App-Glocke | immer an | kein Toggle |

**Soll Phase D:** pro Ereignis aus Katalog: In-App · Push · Mail (je Nutzerrolle).

---

## 4. Wege im Detail (Kurz)

### 4.1 CRM-Glocke (Staff) — Typen

Quelle: `notifications/actions.ts` (`CrmNotificationTyp`).

| Typ | Auslöser (Kurz) | Empfänger | Text heute |
|-----|-----------------|-----------|------------|
| `neue_anfrage` | Lead neu / HV-Meldung | staff | Hardcoded + Lead |
| `hm_befund_freigabe` | HM-Vorbefund fertig | staff | Hardcoded |
| `handwerker_update` | Positionseintrag Partner | staff | DB + Label |
| `handwerker_angenommen` / `_abgelehnt` | Partner-Zusage | staff | DB |
| `handwerker_einreichung` | Partner-Angebot PDF | staff | DB |
| `hw_rechnung_eingegangen` | Partner-Rechnung | staff | DB |
| `vorgang_angenommen` / `_abgelehnt` | Leistungsanfrage | staff | DB |
| `projektvertrag_bestaetigt` | Vertrag OK | staff | DB |
| `abnahme_bestaetigt` / `_freigabe_ausstehend` | Abnahme | staff | DB |
| `hw_auftrag_erledigt` | Partner erledigt | staff | DB |
| `auftrag_abgeschlossen` | Auftrag zu | staff | DB |
| `partner_positions_meldung` | Nachtrag/Mehrbedarf | staff | DB |
| `partner_weitere_arbeit` | Regie in Prüfung | staff | DB |
| `partner_compliance_*` | Compliance Upload/Lösch | staff | DB/hardcoded |
| `partner_unterlage` / `_fachdoku` | Upload / Fachnachweis | staff | DB |
| `angebot_entscheidung` | Kunde/HV Annehmen/Ablehnen | staff | DB |

### 4.2 Portal-Glocken

| Rolle | Tabelle | Typische Events | Text |
|-------|---------|-----------------|------|
| Kunde | `portal_notifications` | Angebot bereit, Status, Auftrag | `PORTAL_NOTIF_*` / `MELDE_NOTIF_COPY` |
| HV | `hv_notifications` | `neue_meldung`, `angebot`, `bautagebuch`, `hm_befund`, `abgeschlossen` | Hardcoded Writer |
| Partner | `notifications` | vor allem `neu` (+ RE überwiesen) | `partnerNotificationSubject` |
| HM | `portal_notifications` | Neuer Prüfvorgang | Hardcoded |

### 4.3 Mail (Ereignis-Gruppen)

| Gruppe | Empfänger | Beispiel-Ereignisse |
|--------|-----------|---------------------|
| Kunde-Transaktion | Kunde | Anfrage-Bestätigung, Angebot, Auftrag, Update, Rechnung, Abnahme |
| HV | Org-E-Mail | Freigabe, Mieter-Event, neue Meldung, HM-Befund |
| Partner | Partner | Anfrage, Zuweisung, Vertrag, Angebot-Antwort |
| Intern | `INTERN_EMAIL` | Lead-Notify, HW-Antwort, RE-Eingang, Cron |
| Auth | User | CRM-Reset, Portal-OTP |

*(Detail-Layouts: DOKUMENTE-MAIL-INVENTUR.)*

### 4.4 Telegram (nur CRM)

| Event | Datei | Empfänger |
|-------|-------|-----------|
| Neue Anfrage Alert | `notifyNewLeadAlert` | staff Chat |
| Copilot Q&A | `api/telegram` | staff |
| Tägliches Briefing | Cron `copilot-briefing` | staff |

### 4.5 Banner (In-App, kein Glocken-Eintrag)

| App | Beispiele |
|-----|-----------|
| CRM | Abnahme-Freigabe, Org-Freigabe, Resolver, Nächster Kontakt |
| Portal | HV Freigabe/Meldung-Aktion, Partner-Onboarding, Admin-View |

---

## 5. Ereigniskatalog (Vorschlag Phase B)

Kanonische IDs für `notify(eventId, …)`. Texte = Soll-Copy (≤ Toast-Budget wo Push; Glocke-Titel ≤ 4–6 Wörter).  
Kanäle: **G** = Glocke · **P** = Push · **M** = Mail · **T** = Telegram · **B** = Banner.

### 5.1 Staff (CRM)

| eventId | Titel (Glocke/Push) | Body (Kurz) | Default G/P/M/T |
|---------|---------------------|-------------|-----------------|
| `anfrage.neu` | Neue Anfrage | Objekt/Gewerk — prüfen | G+P+M(intern)+T |
| `anfrage.hm_befund` | HM-Befund bereit | Freigabe / Disposition | G+P |
| `partner.angenommen` | Partner angenommen | Gewerk / Vorgang | G+P |
| `partner.abgelehnt` | Partner abgelehnt | Gewerk / Vorgang | G+P |
| `partner.update` | Partner-Update | Leistungseintrag | G+P |
| `partner.einreichung` | Angebot eingereicht | Partner → CRM | G+P |
| `partner.rechnung` | Partner-Rechnung eingegangen | Partner-Rechnung | G+P+M(intern) |
| `partner.erledigt` | Als erledigt gemeldet | Auftrag | G+P |
| `partner.compliance` | Unterlage prüfen | Compliance | G+P |
| `angebot.entscheidung` | Angebot entschieden | Angenommen / Abgelehnt | G+P |
| `vertrag.bestaetigt` | Vertrag bestätigt | Partner | G+P |
| `abnahme.bereit` | Abnahme prüfen | Freigabe ausstehend | G+P+B |
| `abnahme.bestaetigt` | Abnahme bestätigt | Partner | G+P |
| `auftrag.abgeschlossen` | Auftrag abgeschlossen | — | G |
| `nachtrag.offen` | Nachtrag prüfen | Positionsmeldung | G+P |
| `rechnung.ueberfaellig` | Rechnung überfällig | *(Pref unverdrahtet)* | G+P+M |

### 5.2 Kunde / MeinBärenwald

| eventId | Titel | Body | Default G/P/M |
|---------|-------|------|---------------|
| `angebot.bereit` | Angebot bereit | Bitte entscheiden | G+P+M |
| `auftrag.bestaetigt` | Auftrag bestätigt | Nächste Schritte | G+P+M |
| `status.wechsel` | Status aktualisiert | Kurzstatus | G+P |
| `bautagebuch.update` | Baustellen-Update | Neuer Eintrag | G+P |
| `rechnung.bereit` | Rechnung bereit | Im Portal ansehen | G+P+M |
| `termin.vorschlag` | Termin wählen | Zeitslots | G+P |
| `feedback.bitte` | Feedback erwünscht | Kurz | G |

### 5.3 HV / Organisation

| eventId | Titel | Body | Default G/P/M |
|---------|-------|------|---------------|
| `meldung.neu` | Neue Meldung | Melder / Objekt | G+P+M |
| `angebot.freigabe` | Freigabe nötig | Angebot prüfen | G+P+M |
| `angebot.bereit_info` | Angebot bereit | Info / unter Schwelle | G+P |
| `hm.befund` | HM-Befund | Ergebnis | G+P+M |
| `partner.erledigt_hv` | Partner erledigt | Abnahme möglich | G+P |
| `bautagebuch.hv` | Bautagebuch | Eintrag veröffentlicht | G+P |
| `mieter.status` | Mieter-Update | Status/Termin | G+M |

### 5.4 Partner

| eventId | Titel | Body | Default G/P/M |
|---------|-------|------|---------------|
| `zuweisung.neu` | Neuer Auftrag | Bestätigung nötig | G+P+M |
| `zuweisung.aenderung` | Auftrag geändert | Leistungen prüfen | M (Glocke heute oft skip) |
| `anfrage.neu_partner` | Neue Anfrage | Gewerk / PLZ | M (+G wenn verdrahtet) |
| `angebot.uebernommen` | Angebot übernommen | Konditionen | M |
| `angebot.rueckfrage` | Rückfrage zum Angebot | CRM | M |
| `vertrag.bereit` | Vertrag bereit | Bestätigen | M |
| `rechnung.ueberwiesen` | Zahlung unterwegs | Erinnerung | G+M |
| `bautagebuch.anfrage` | Bautagebuch anfordern | — | M |

### 5.5 Hausmeister

| eventId | Titel | Body | Default |
|---------|-------|------|---------|
| `pruefung.neu` | Neuer Vorgang | Vor-Ort prüfen | G+P+M(Kontakt) |

### 5.6 Auth / System (Ausnahmen)

| eventId | Kanal | Hinweis |
|---------|-------|---------|
| `auth.otp` / `auth.reset` | nur Mail | kein Objekt-Betreff |
| `system.briefing` | Telegram | Staff-Copilot |

---

## 6. Architektur-Vorschlag (nach Freigabe)

```
notify(eventId, { empfaenger, vorgangId?, payload? })
  → Katalog: Default-Kanäle + Copy
  → User-Prefs überschreiben
  → Adapter: glockeWrite | pushSend | mailSend | telegramSend
```

| App | Dienst-Pfad (Soll) | Copy |
|-----|--------------------|------|
| CRM | `src/lib/notify/index.ts` | `src/lib/copy` + Katalog |
| Portal | `src/lib/notify/index.ts` | `src/lib/portal-copy` + Katalog |

Shared Event-IDs wo CRM↔Portal gekoppelt (z. B. `angebot.bereit`).

---

## 7. Offene Punkte für Freigabe

1. **Telegram:** weiter nur Staff-Lead/Briefing, oder in Katalog als optionaler Kanal?  
2. **Partner-Glocke:** heute nur `neu` (+ RE) — sollen `geaendert`/`bautagebuch` auch in die Glocke?  
3. **Eine Glocken-Tabelle** langfristig vs. Adapter über 3 Portal-Tabellen + CRM-Aggregation?  
4. **Mieter:** weiterhin keine Mail/Glocke an Melder — nur HV?  
5. **Pref-Granularität:** pro `eventId` × {Glocke, Push, Mail} oder Cluster wie heutige CRM-Switches?  
6. **`rechnung.ueberfaellig`:** Pref verdrahten oder Switch entfernen?

---

## 8. STOPP

**Phase A Ende.** Keine `notify()`-Implementierung, keine Glocken-Merge, keine Pref-UI bis Freigabe §7.
