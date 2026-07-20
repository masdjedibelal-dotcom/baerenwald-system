# Prozess Betroffenenrechte — Mieter-Meldungen (HV + Bärenwald)

> Operativer Soll-Prozess. Mit Anwalt final abstimmen.

---

## 1. Zuständigkeit (Empfehlung)

| Anfrage von | Erste Ansprechstelle | Bärenwald-Rolle |
|-------------|----------------------|-----------------|
| Mieter/Melder | **Hausverwaltung** | technische Unterstützung, CRM-Export |
| HV-Mitarbeiter (Portal) | Bärenwald Support | Account/Portal |
| Handwerker | Bärenwald Partner-Support | gemäß Partner-Vertrag |

---

## 2. Eingangskanäle

- E-Mail HV (im Mietvertrag/Hausordnung genannt)
- E-Mail Bärenwald: info@baerenwald-muenchen.de (Weiterleitung an HV wenn Mieter-Meldung)
- CRM-Modul: `Einstellungen → Datenschutz → Anfragen`

---

## 3. Ablauf im CRM

1. Anfrage erfassen (`datenschutz_anfragen`: Typ `auskunft` | `loeschung` | `einschraenkung`)
2. Lead/Melder zuordnen (Suche: `melder_email`, Name, Objekt, Datum)
3. HV informieren (wenn HV verantwortlich)
4. Frist: **1 Monat** (Art. 12 Abs. 3 DSGVO), Verlängerung +2 Monate bei Komplexität
5. Ergebnis dokumentieren in `notizen`, Status `erledigt`
6. Technische Umsetzung:
   - **Auskunft:** Export aus Lead-Detail (Melder-Block, Fotos, Historie)
   - **Löschung:** `execute-loeschung` / manuelle Anonymisierung — nur wenn keine Aufbewahrungspflicht
   - **Einschränkung:** Flag im CRM (ggf. neues Feld) + keine Weiterverarbeitung

---

## 4. Was nicht ohne Prüfung gelöscht wird

- Laufende Aufträge / offene Angebote
- Steuerrelevante Belege (10 Jahre)
- Daten mit gesetzlicher Aufbewahrung

→ CRM prüft via `hatKundeSteuerlicheAnhaenge` / Auftrag-Status

---

## 5. Mieter ohne MeinBärenwald-Konto

- Melder hat **kein Pflicht-Konto**
- Auskunft/Löschung über E-Mail + Identitätsprüfung (Name, Einheit, Meldedatum)
- HV kann Identität gegen Mietvertrag prüfen

---

## 6. Datenpanne (Art. 33/34)

1. Bärenwald erkennt Vorfall → HV innerhalb **72h** informieren
2. HV entscheidet über Meldung an Aufsicht / Betroffene
3. Protokoll im CRM (Lead-Notiz + internes Incident-Log)

---

## 7. CRM-To-dos (noch offen)

- [ ] Anfrage-Typ „Mieter-Meldung“ als Filter/Tag
- [ ] Export-Button „Melder-Auskunft PDF“ im Lead-Detail
- [ ] Lösch-Workflow für `funnel_daten.fotos` + Storage-Pfade
- [ ] Schulungs-Sheet für CRM-Nutzer (1 Seite)
