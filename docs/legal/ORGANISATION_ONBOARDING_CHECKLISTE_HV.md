# Onboarding-Checkliste — Neue Hausverwaltung (Organisation)

Vor Livegang mit echten Mietern abhaken.

---

## Vertrag & Datenschutz

- [ ] Auftraggebervertrag unterschrieben
- [ ] AVV (Anlage 1) unterschrieben
- [ ] Rollenmodell geklärt (HV verantwortlich vs. Art. 26) — Anwalt
- [ ] Ansprechpartner Datenschutz bei HV benannt
- [ ] HV-eigene Datenschutzerklärung um Melde-Link ergänzt
- [ ] Mieter-Information vorbereitet (Hausordnung / Aushang / E-Mail-Vorlage)

---

## CRM-Stammdaten

- [ ] Kunde angelegt: `portal_modus = organisation`
- [ ] `org_kennung` vergeben (eindeutig, lowercase)
- [ ] `org_anzeigename`, Logo optional
- [ ] Freigabe-Modus gesetzt (`freigabe` / `direkt`, Schwelle, Notfall)
- [ ] Mindestens 1 Objekt mit `melde_slug` + `melde_aktiv = true`
- [ ] Portal-Einladung an HV-Kontakt gesendet

---

## Technischer Test

- [ ] Melde-Link öffnen: `/melden/{org_kennung}/{melde_slug}`
- [ ] Test-Meldung ohne Foto
- [ ] Test-Meldung mit Foto
- [ ] Lead im CRM: `anlass=meldung`, `erfassung_von=melder`, Melder-Block sichtbar
- [ ] HV sieht Meldung im Portal unter **Eingang**
- [ ] Freigabe-Workflow getestet
- [ ] Partner sieht Anfrage **erst nach Freigabe**
- [ ] Bestätigungs-E-Mail an Melder erhalten
- [ ] Optional: MeinBärenwald-Registrierung getestet

---

## HV-Einladungsflow (Vorerfassung)

- [ ] HV erfasst Meldung mit Mieter-E-Mail
- [ ] Einladungslink `/melden/ergaenzen/{token}` funktioniert
- [ ] Nach Ergänzen: `einladung_status = ergaenzt`

---

## Datenschutz-Betrieb

- [ ] VVT-Eintrag „Mieter-Schadenmeldungen“ im CRM
- [ ] Löschfristen für Melder-Leads konfiguriert
- [ ] Prozess Betroffenenanfragen mit HV abgestimmt

---

## Go-Live

- [ ] Melde-Link in HV-Kommunikation veröffentlicht
- [ ] Interner Ansprechpartner bei Bärenwald benannt
- [ ] Datum Go-Live: __________
