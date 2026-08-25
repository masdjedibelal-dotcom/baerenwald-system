# TESTREPORT-ETAPPE-3 — Rollen-Durchstich + Katalog A/B

| Feld | Wert |
|---|---|
| Etappe | 3 — Rollen-Durchstich + Katalog A (Anfrage) + B (Angebot) |
| Datum | 2026-08-25 |
| Umgebung | Staging CRM `staging--baerenwald-backend.netlify.app` · Website `staging--baerenwald.netlify.app` · Supabase `soqownnkxmtfgvsbrgsl` |
| Ergebnis | **1 ✅ · 2 ❌ · 6 ⚠️ · 22 🚫** von 31 (11 E2E-Schritte + 9 A + 11 B) |
| Mail-STOPP | Weiter aktiv — kein Angebot/Partner/Rechnung-Versand; Termin-Modal hat Mail default **an** |
| Screenshots | `docs/test/screenshots/etappe-3/` |
| Fund-IDs | fortlaufend ab **F-042** |
| Setup | `docs/test/TESTPLAN-SETUP.md` |

---

## Kurzüberblick

1. **Melde-Funnel (T-E2E-01.1)** läuft: Foto, Kontakt `zztest.mieter.e2e@example.test`, Status-Link funktioniert. **Staging-CTA noch „Zu Bärenwald registrieren“** (Repo-Fix vorhanden, Staging nicht aktuell). **Referenz** im UI nicht angezeigt (Prop deprecated).
2. **CRM (T-E2E-01.2)** zeigt Org/Objekt/Melder korrekt; Kanal `hv_melder_link` in DB, Label „HV-Meldung“ in Detail-Oberfläche **nicht** sichtbar. Primär-Badge **„Warte auf HV / Hausmeister“**.
3. **„Gleiche Geschichte“ gebrochen:** CRM Lead `status=termin` nach Termin-Flow, Mieter-Timeline weiter **„Eingegangen“** und Text „Sobald Termine … feststehen“.
4. **Doppel-Meldung:** zwei ZZTEST-Leads mit gleichem Melder/Text innerhalb ~1 Min (Retry/Doppel-Submit).
5. **Restlicher HV-Durchstich (.3–.11) und Katalog B** überwiegend **🚫 Mail-STOPP** (Senden löst Resend aus). Katalog A teilweise live / Code-Ist.

---

## ZZTEST-IDs (für Etappe 4/5 wiederverwenden)

| Typ | Name / Hinweis | ID |
|---|---|---|
| Lead (primär E2E) | ZZTEST-E2E Meldung Leopold · `hv_melder_link` · Token `CwAyzSzd…` | `ed941123-35ac-485b-b69d-e3ffee6a95fe` |
| Lead (Duplikat) | gleicher Melder/Text · Token `mEkrVhCU…` | `dc47f7ac-2c23-4655-851d-a409b52bfa22` |
| Org (HV) | Musterverwaltung Nord · `staging-muster-nord` · Schwelle 500 € | `1b6cccda-6fdf-4b9c-84b3-b58ade30da94` |
| Objekt | WEG Leopold 10 (Staging) · `staging-leopold-10` | `5de631be-d4b0-4169-ba56-2d0e148b3c60` |
| Kunde (Melder-Datensatz) | ZZTEST E2E · `zztest.mieter.e2e@example.test` | `8f362b92-2493-4589-ae36-fb30f1fa708c` |
| Kunde (Privat, Etappe 2) | ZZTEST-Privat Berger | `ea7e8163-a0ea-4ab5-b8dc-3e147798c7c9` |
| Lead (Telefon/Berger-Pfad) | Status angebot · kein Melde-Token | `3ee5106d-8ad7-4f66-b3a5-6fe4af7cfda5` |
| Angebot | `kunde_akzeptiert` (Berger-Pfad) | `8aace99d-b98c-4cef-8f2a-cd9ebd01cfb3` |
| Auftrag | Status `offen` · Lead Berger-Pfad | `11209afb-f290-4ed3-94ef-8282aafec532` |
| Status-URL (primär) | `/melden/status/CwAyzSzdTEubKkhrXmxmSP02v3b4f2I_` | — |
| Status-URL (Duplikat) | `/melden/status/mEkrVhCU6SQ8IR8vUWO73akyUa-TfMDP` | — |
| Melde-URL | `/melden/staging-muster-nord/staging-leopold-10` | — |

**Hinweis:** Primär-Lead `ed941123-…` hat nach T-A02/A03: `melder_einheit=ZZTEST WE EG`, `status=termin`. Duplikat `dc47f7ac-…` bleibt `neu` — für saubere „Neu“-Tests nutzen.

---

## T-E2E-01 — Durchstich

### F-042 · T-E2E-01.1 · ❌ Fehlgeschlagen · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | Mieter · `/melden/staging-muster-nord/staging-leopold-10` → Bestätigung |
| Screenshot | `T-E2E-01.1-bestaetigung-cta.png`, `T-E2E-01.1-status-timeline.png`, Funnel-Steps |
| Erwartet | Funnel inkl. Foto; Bestätigung mit Referenz + Status-Link; CTA **ohne** „Bärenwald“ |
| Beobachtet | Funnel + Foto + Lead in DB ✅. Status-Link ✅ (`Eingegangen`). **Primär-CTA live: „Zu Bärenwald registrieren“**. Repo `mieter-wl.ts` hat bereits neutralen Text — Staging-Deploy fehlt. **Referenz** wird im Client nicht mehr gerendert (`referenz` `@deprecated`). Page-Title weiter „… Bärenwald München“. |
| Einordnung | Neuer Fund (Staging vs. Repo) · Referenz-Anzeige fehlend |

**Nebenbefund:** Zwei Leads (`ed941123`, `dc47f7ac`) — Doppel-Submit / parallele Sessions.

---

### F-043 · T-E2E-01.2 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | CRM Staff · `/anfragen/ed941123-…` |
| Screenshot | `T-E2E-01.2-crm-anfrage-detail.png`, `T-E2E-01.2-anfrage-detail-full.png`, `T-E2E-01.2-crm-vorgaenge.png` |
| Erwartet | Anfrage mit Org-/Objekt-/Melder-Kontext und Kanal |
| Beobachtet | Org Musterverwaltung Nord, Melder ZZTEST E2E, Objekt WEG Leopold 10 ✅. DB `kanal=hv_melder_link`. UI-Detail: **kein sichtbares Kanal-Label „HV-Meldung“**. Badge **Neu** + CTA **„Warte auf HV / Hausmeister“**. Verlaufsphrase „Anfrage: eingegangen“. |
| Einordnung | Neuer Fund (Kanal-Label fehlt in Detail) |

**Gleiche Geschichte (nach .1):** Mieter „Eingegangen“ vs. CRM Badge „Neu“ / CTA „Warte auf HV“ — Wortlaut nicht kanonisch deckungsgleich.

---

### F-044 · T-E2E-01.3 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Angebot-Wizard bis Versand würde Mail auslösen. Mail-STOPP. Kein neues Angebot auf dem HV-Lead angelegt. |
| Einordnung | Mail-STOPP |

---

### F-045 · T-E2E-01.4 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Partner-Einholung = Versand/Notify. Code-Gate: `send-handwerker-anfrage.ts` blockiert bei fehlender Org-Freigabe. Live nicht ausgeführt. |
| Einordnung | Mail-STOPP |

---

### F-046 · T-E2E-01.5 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | HV-Freigabe ablehnen/erteilen setzt Mail/Notify voraus bzw. Folgeversand. Org-Schwelle Musterverwaltung: **500 €**. Lead `org_freigabe_status=nicht_noetig` (unter Schwelle / Bypass). |
| Einordnung | Mail-STOPP + Vorgang noch ohne Angebot |

---

### F-047 · T-E2E-01.6 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Annahme = Portal/Mail-Pfad. Parallel existiert bereits Auftrag `11209afb-…` am Berger-Lead (nicht HV-Melde-Pfad). |
| Einordnung | Mail-STOPP / anderer Pfad |

---

### F-048 · T-E2E-01.7 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | HW zuweisen/senden + Partner-Portal + Bautagebuch — Versand/Partner-Notify. |
| Einordnung | Mail-STOPP |

---

### F-049 · T-E2E-01.8 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Nachtrag-Token + Kundenbestätigung. Kein laufender Auftrag am HV-Lead. |
| Einordnung | Seed + Mail-STOPP |

---

### F-050 · T-E2E-01.9 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Abnahme-Wizard benötigt Auftrag. Staging HV-Lead ohne Auftrag. |
| Einordnung | Seed |

---

### F-051 · T-E2E-01.10 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Abschlag/Schlussrechnung senden = Mail + Nummernvergabe. |
| Einordnung | Mail-STOPP |

---

### F-052 · T-E2E-01.11 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Abschluss nur nach .1–.10. Timeline bisher nur Schritt „Eingegangen“. |
| Einordnung | Vorgänger blockiert |

---

## Katalog A — Anfrage

### F-053 · T-A01 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Erwartet | Alle Kanäle landen im CRM mit korrektem Kanal + Kontext |
| Beobachtet | **Live:** Melde-Funnel → `hv_melder_link` ✅ (E2E). **Nicht live:** Website-Rechner, GPT-Lead, HV „Neuer Vorgang“, CRM-Staff-Funnel (Zeit/Mail-Risiko). Seed-Beispiele in Liste: Telefon/Website-ähnliche Einträge vorhanden. |
| Einordnung | Teilabdeckung · Rest offen |

---

### F-054 · T-A02 · ✅ Bestanden · —

| Feld | Inhalt |
|---|---|
| Rolle + URL | CRM · Melder & Leistungsort bearbeiten · Lead `ed941123-…` |
| Screenshot | `T-A02-melder-edit-dialog.png` |
| Erwartet | Änderungen speichern; Verknüpfungen bleiben |
| Beobachtet | Einheit auf **„ZZTEST WE EG“** gesetzt. DB: `kunde_objekt_id` Leopold und `auftraggeber_kunde_id` Org unverändert. |
| Einordnung | — |

---

### F-055 · T-A03 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | CRM · Weitere Aktionen · Lead `ed941123-…` |
| Erwartet | Status manuell durchschalten (Kontaktiert, Termin, …) und zurück; Unlogisches blockiert oder bewusst möglich — Ist dokumentieren |
| Beobachtet | Menü bei `neu`: **„Termin vereinbart“**, **„Nicht erreichbar“**, **„Als verloren markieren“** — **kein** direkter Punkt „Kontaktiert“ / „Zurück zu Neu“. Termin-Modal: Bestätigungs-Mail **default an** (`zztest…@example.test`). Speichern-Button war nach Mail-Uncheck zeitweise disabled; Lead steht in DB trotzdem auf **`termin`**. **Zurück zu Neu** nicht angeboten. |
| Einordnung | Neuer Fund (kein freies Status-Durchschalten; Mail default) |

---

### F-056 · T-A03/E2E · ❌ Fehlgeschlagen · Blocker (Konsistenz)

| Feld | Inhalt |
|---|---|
| Rolle + URL | CRM `status=termin` vs. Mieter `/melden/status/CwAyzSzd…` |
| Erwartet | Gleiche Geschichte / kanonischer Wortlaut |
| Beobachtet | CRM: `termin`. Mieter: weiter **„Eingegangen — … eingegangen.“** + „Sobald Termine oder Arbeiten feststehen, erscheinen sie hier.“ |
| Einordnung | Neuer Fund — Kernprüfung gescheitert |

---

### F-057 · T-A04 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | „Verloren“ bewusst nicht gesetzt (Status-Link / Pipeline für spätere Etappen schonen). Code: Label `abgebrochen` → „Verloren“. |
| Einordnung | Bewusst übersprungen |

---

### F-058 · T-A05 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Duplizieren in dieser Runde nicht ausgeführt. |
| Einordnung | Zeit |

---

### F-059 · T-A06 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Soft-Delete/Restore nicht ausgeführt (Basisdaten schützen). Code: `soft-delete-lead.ts` + Restore in `anfragen/actions.ts`. |
| Einordnung | Bewusst übersprungen |

---

### F-060 · T-A07 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Spam-Markierung nicht ausgeführt. |
| Einordnung | Bewusst übersprungen |

---

### F-061 · T-A08 · ⚠️ Teilweise · —

| Feld | Inhalt |
|---|---|
| Beobachtet | E2E-Funnel war Wasser/Austritt mit Gefahr Rutsch — CRM nicht als expliziter „Notfall“-Badge im Detail-Screenshot. DB `funnel_daten.notfall=false`. Akut-Pfad mit Sofortmaßnahmen Org-konfiguriert nicht separat durchgespielt. |
| Einordnung | Teil |

---

### F-062 · T-A09 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | `/melden/ergaenzen/[token]` nicht befüllt. Token-URL-Builder existiert (`melde-url.ts`). |
| Einordnung | Zeit |

---

## Katalog B — Angebot

### F-063 · T-B01 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Kein Angebot-Entwurf am HV-Lead. Maria-Koch-Entwurf `6d099c2a-…` (Etappe 2) nicht erneut positioniert. |
| Einordnung | Zeit / Fokus HV |

---

### F-064 · T-B02–T-B07 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Korrektur/erneut senden, Ersetzt, Ablehnen, Ablauf, Partner-Einholung zurückziehen/verwerfen — alles Versand- oder Partner-Notify-Pfade. |
| Einordnung | Mail-STOPP |

---

### F-065 · T-B08 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | AG-Korrektur braucht laufenden Auftrag; Berger-Auftrag `11209afb-…` vorhanden, Wizard nicht gefahren (Mail/Risiko). |
| Einordnung | Zeit + Vorsicht |

---

### F-066 · T-B09 · ⚠️ Teilweise (Code) · Wichtig

| Feld | Inhalt |
|---|---|
| Erwartet | Ohne Freigabe Partner-Versand blockiert mit verständlichem Hinweis |
| Beobachtet | Code `send-handwerker-anfrage.ts`: `orgFreigabeBlockiertPartner` → Message „Wartet auf Org-Freigabe…“ bzw. bei Ablehnung eigene Message. Live nicht ausgelöst (Lead `nicht_noetig`). |
| Einordnung | Code-Befund |

---

### F-067 · T-B10 · ⚠️ Teilweise · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Privatkunde-Annahme: Auftrag `11209afb-…` + Angebot `8aace99d-…` (`kunde_akzeptiert`) am Lead `3ee5106d-…` / Kunde ZZTEST-Privat Berger bereits vorhanden (nicht dieser Durchstich). Portal-Live-Annahme nicht wiederholt. |
| Einordnung | Vorhandene Seed/Test-Spur |

---

### F-068 · T-B11 · ⚠️ Teilweise (Daten) · —

| Feld | Inhalt |
|---|---|
| Erwartet | Unter Schwelle Direkt-Auftrag; über Schwelle blockiert |
| Beobachtet | Org-Schwelle Musterverwaltung Nord: **500 €**. E2E-Lead `org_freigabe_status=nicht_noetig`. Live Über-/Unter-Schwelle-Versand nicht getestet. |
| Einordnung | Datenlage dokumentiert |

---

## Fund-Liste (neu in Etappe 3)

| ID | Kurz | Schwere |
|---|---|---|
| F-042 | Staging-CTA „Zu Bärenwald registrieren“; Referenz fehlt | Wichtig |
| F-043 | Kanal-Label in Anfrage-Detail nicht sichtbar | Wichtig |
| F-056 | CRM `termin` ≠ Mieter „Eingegangen“ | Blocker (Konsistenz) |
| F-055 | Kein freies Status-Durchschalten; Termin-Mail default an | Wichtig |
| F-066 | Freigabe-Gate Partner (Code ok, live 🚫) | — |
| — | Doppel-Lead ZZTEST | Wichtig (Datenhygiene) |

---

## Commit-Vorlage (GitHub Desktop)

Geänderte / neue Dateien:

1. `docs/test/TESTREPORT-ETAPPE-3.md` — Report Etappe 3 inkl. ZZTEST-ID-Liste und Funde F-042ff.
2. `docs/test/screenshots/etappe-3/*` — Screenshots Melde-Funnel, Bestätigung/CTA, Status-Timeline, CRM Detail/Liste, Melder-Edit.

---

## Empfohlene nächste Schritte (kein Fix in dieser Etappe)

1. Staging-Website mit aktuellem `MIETER_WL_BESTAETIGUNG.register_de` deployen.
2. Mail-Catcher/Staging-Guard (Etappe 0) — sonst bleiben .3–.11 und Katalog B weitgehend 🚫.
3. Primär-Lead `ed941123-…` für Etappe 4 behalten; Duplikat `dc47f7ac-…` für „Neu“-Fälle nutzen oder soft-deleten (nach Freigabe).
)
