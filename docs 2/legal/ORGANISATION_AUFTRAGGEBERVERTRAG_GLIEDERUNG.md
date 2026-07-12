# Auftraggebervertrag (Hausverwaltung) — Gliederung

> **Vorlage für Anwalt.** Kein Rechtsgutachten.  
> Vorbild: Partner-Rahmenvertrag inkl. AVV (`partner-rahmenvertrag-text.ts`).

---

## Vertragsparteien

- **Auftraggeber / Verantwortlicher (HV):** [Firma, Adresse, GF, Datenschutz-Kontakt]
- **Auftragsverarbeiter / Dienstleister:** Bärenwald (Beran Cakmak, Bärenwaldstraße 20, 81737 München)

---

## 1. Gegenstand

- Nutzung des Auftraggeber-Portals (Organisation-Modus)
- Öffentliche Melde-Links für Mieter (`/melden/{org}/{objekt}`)
- Koordination von Schadenmeldungen, Projekten und Servicepaketen
- Technische Bereitstellung von CRM, Speicher, E-Mail, Partner-Zuweisung

---

## 2. Rollen im Datenschutz (zentral)

**Option A (empfohlen prüfen lassen):** HV allein verantwortlich gegenüber Mietern; Bärenwald Auftragsverarbeiter.

**Option B:** Gemeinsame Verantwortlichkeit Art. 26 DSGVO — dann separate Vereinbarung mit klarer Zuständigkeit für:
- Informationspflichten (Art. 13/14)
- Betroffenenanfragen (Art. 15–22)
- Meldepflicht bei Datenpannen (Art. 33/34)

---

## 3. Pflichten der Hausverwaltung

- Mieter über Melde-Link und Datenverarbeitung informieren (Hausordnung, Aushang, Mietvertrag-Anlage)
- Melderdaten nur mit Rechtsgrundlage erfassen (Mietverhältnis)
- Bei Vorerfassung/Einladung: nur E-Mail/Telefon übermitteln, wenn berechtigt
- Zugang zum Portal nur für berechtigte Mitarbeiter
- Freigabe-Workflow verantwortungsvoll nutzen
- HV-eigene Datenschutzerklärung um Melde-Prozess ergänzen

---

## 4. Pflichten von Bärenwald

- Bereitstellung Portal, Meldeformular, Speicher, CRM
- Verarbeitung nur auf dokumentierte Weisung der HV
- TOMs, Unterauftragsverarbeiter-Transparenz
- Unterstützung bei Betroffenenanfragen (technisch)
- Meldung von Datenschutzvorfällen innerhalb 72h an HV

---

## 5. Melde-Prozess

| Schritt | Akteur |
|---------|--------|
| Mieter meldet über Link | öffentlich, ohne Konto |
| Lead in CRM | `kanal: hv_melder_link`, `anlass: meldung` |
| HV prüft im Portal (Eingang) | Freigabe |
| Bärenwald koordiniert | Handwerker-Zuweisung nach Freigabe |
| Notfall | ggf. sofortige Weiterleitung (wenn `notfall_direkt`) |

---

## 6. Vergütung / Leistungsumfang

- [wie vereinbart]

---

## 7. Haftung & Gewährleistung

- [Anwalt]

---

## 8. Laufzeit & Kündigung

- [Anwalt]
- Bei Vertragsende: Datenrückgabe/Löschung gemäß AVV

---

## 9. Anlagen (Pflicht)

| Anlage | Inhalt |
|--------|--------|
| **Anlage 1** | AVV gemäß Art. 28 DSGVO → siehe `ORGANISATION_AVV_ANLAGE_VORLAGE.md` |
| **Anlage 2** | Liste Unterauftragsverarbeiter + TOMs |
| **Anlage 3** | Technische Beschreibung Melde-Flow |
| **Anlage 4** | Onboarding-Checkliste → siehe `ORGANISATION_ONBOARDING_CHECKLISTE_HV.md` |

---

## 10. Unterschriften

- HV: _______________________  Datum: __________
- Bärenwald: __________________  Datum: __________
