# AVV-Anlage — Hausverwaltung ↔ Bärenwald (Art. 28 DSGVO)

> **Vorlage für Anwalt.** Anlage zum Auftraggebervertrag.

---

## 1. Parteien

- **Verantwortlicher (Auftraggeber):** [Hausverwaltung — vollständige Firma]
- **Auftragsverarbeiter:** Bärenwald, Beran Cakmak, Bärenwaldstraße 20, 81737 München

---

## 2. Gegenstand und Dauer

**Gegenstand:** Verarbeitung personenbezogener Daten im Rahmen des Auftraggeber-Portals und der Mieter-Schadenmeldungen über `/melden`.

**Dauer:** Laufzeit des Hauptvertrags plus Abwicklungspflichten nach Vertragsende.

---

## 3. Art und Zweck der Verarbeitung

| Zweck | Beschreibung |
|-------|--------------|
| Melde-Erfassung | Entgegennahme von Schadenmeldungen über öffentliches Formular |
| Portal | Bereitstellung Eingang, Freigabe, Objektverwaltung für HV |
| Koordination | Weiterleitung an Bärenwald-interne Prozesse und Handwerker |
| Kommunikation | E-Mail-Benachrichtigungen (Resend, Supabase Auth) |
| Dokumentation | Fotos, Vorgangshistorie, Freigabe-Log |

---

## 4. Kategorien betroffener Personen

- Mieter / Melder
- Ansprechpartner der Hausverwaltung
- ggf. Eigentümer (indirekt über Objektbezug)

---

## 5. Arten personenbezogener Daten

- Name, E-Mail, Telefon, Wohnung/Einheit
- Schadensbeschreibung, Kategorie, Zeitbezug
- Fotos (Schadensdokumentation)
- Objektadresse, Org-Bezug
- Technische Daten (IP für Rate-Limit, Zeitstempel)
- Portal-Login-Daten der HV-Mitarbeiter (separat, Supabase Auth)

---

## 6. Weisungsrecht

Die HV erteilt Weisungen schriftlich oder über das Portal (Freigabe, Ablehnung, Objektverwaltung). Bärenwald verarbeitet nur im Rahmen dieser Weisungen und des Vertrags.

---

## 7. Pflichten des Auftragsverarbeiters (Bärenwald)

- Verarbeitung nur auf dokumentierte Weisung
- Vertraulichkeit der Mitarbeiter
- TOMs gemäß Anlage 2
- Unterstützung bei Betroffenenrechten (Art. 15–22)
- Unterstützung bei Datenschutz-Folgenabschätzung
- Löschung/Rückgabe nach Vertragsende
- Nachweis der Einhaltung (Art. 28 Abs. 3 lit. h)
- Meldung von Datenschutzvorfällen unverzüglich, spätestens 72h

---

## 8. Pflichten des Verantwortlichen (HV)

- Rechtsgrundlage für Datenübermittlung an Bärenwald
- Information der Mieter (Art. 13/14)
- Erste Ansprechstelle für Betroffenenanfragen (empfohlen)
- Weisungen nur rechtmäßig erteilen

---

## 9. Unterauftragsverarbeiter (Auszug)

| Anbieter | Zweck | Standort |
|----------|-------|----------|
| Supabase Inc. | Datenbank, Auth, Storage | EU (Frankfurt) |
| Resend Inc. | Transaktions-E-Mails | USA (DPF) |
| Netlify Inc. | Hosting Website | USA (DPF) |
| PostHog Inc. | Statistik (nur nach Cookie-Einwilligung) | EU (Frankfurt) |

Änderungen werden der HV mitgeteilt; Widerspruchsrecht gemäß Art. 28 Abs. 2.

---

## 10. Technische und organisatorische Maßnahmen (TOMs — Kurz)

- Zugriffskontrolle (RLS, Portal-Auth, CRM-Rollen)
- Verschlüsselung Transport (TLS)
- Mandantentrennung (Org-Bezug `auftraggeber_kunde_id`)
- Logging Löschungen (`datenschutz_loeschlog`)
- Rate-Limit öffentliches Meldeformular
- Backup & Wiederherstellung (Supabase)

---

## 11. Löschung und Rückgabe

Nach Vertragsende oder auf Weisung: Löschung oder Anonymisierung der HV-bezogenen Daten innerhalb [30] Tagen, soweit keine gesetzliche Aufbewahrungspflicht entgegensteht.

Konkretes Löschkonzept: siehe CRM-Handoff `DATENSCHUTZ_CRM_HANDOFF.md`.

---

## 12. Kontrollrechte

Die HV kann angemessene Nachweise anfordern (TOMs, Unterauftragsverarbeiter-Liste). Audits nach vorheriger Ankündigung in angemessenem Umfang.

---

## 13. Unterschriften

- HV: _______________________
- Bärenwald: ___________________
