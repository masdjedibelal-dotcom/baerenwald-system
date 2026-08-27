# 06 — Prozesse (End-to-End)

Wie die Welten zusammenspielen. Jeder Ablauf in der Sprache der Nutzer.

---

## 1) Privatkunde über Website

```
Website Rechner/GPT → Anfrage im CRM → Angebot erstellen & senden
  → Kunde sieht Angebot (Mail / MeinBärenwald / Projekt-Link)
  → Annahme → Auftrag → Handwerker zuweisen & senden
  → Ausführung (Bautagebuch, Updates) → Abnahme → Rechnung(en) → fertig
```

**CRM-Jobs zwischendurch:** nachfassen, korrigieren, Nachtrag, Zahlplan, Dokumente.

---

## 2) Mieter meldet über Hausverwaltung

```
Aushang/QR → /melden/org/objekt → Funnel → Bestätigung + Status-Link
  → Anfrage im CRM mit Org-/Objekt-/Melder-Kontext (hv_meldung_status = neu)
  → HV entscheidet im Auftraggeber-Portal (MeinBärenwald, Tab Freigaben/Eingang)
  → erst danach: CRM Primary „Angebot erstellen“
  → Partner anfragen / Auftrag fortsetzen
  → Mieter sieht Timeline auf Status-Seite (Termine, Feedback, Abnahme-PDF)
```

**CRM konfiguriert:** Kunde vom Typ HV → Tab Organisation + Objekte mit Melde-Links.

### HV-Start-Gate → Angebot (Staff-Weg)

| Phase | `hv_meldung_status` | CRM Primary | Wer handelt? |
|---|---|---|---|
| Meldung eingegangen | `neu` (Default) | **Warte auf HV / Hausmeister** (Sheet mit Erklärung) | HV im Portal |
| Hausmeister-Prüfung | `hm_pruefung` | weiterhin gesperrt | HM + HV |
| Freigegeben für BW | `angebot_eingefordert` | **Angebot erstellen** | Bärenwald-Staff |
| Notmaßnahme / Akut | `notmassnahme` oder Akut-Flag | **Direkt beauftragen** | Bärenwald (Gate umgangen) |

**HV-Aktionen (Website `/api/org/meldung-aktion`):**

- **An Bärenwald übergeben** (`angebot_einfordern`) — aus `neu` oder Override aus `hm_pruefung` → `angebot_eingefordert`
- **Hausmeister begutachten** (`hm_begutachten`) — `neu` → `hm_pruefung`; Abschluss via Befund (`fachfirma_angebot`) oder HV-Override → `angebot_eingefordert`
- **Kleinreparatur / Ablehnen** — nur aus `neu`

**Code-Gate (CRM):** `leadWartetAufHvStartFreigabe()` blockiert Angebot/Partner-Versand solange Status ∈ {`neu`, `hm_pruefung`} und keine Akut-Meldung.

**UI HV-Portal:** `OrganisationEingangPanel` / `OrgMeldungAktionBanner` — Buttons „An Bärenwald übergeben“, „Hausmeister begutachten“.

> **Offene Produktfrage (2026-08-27, nicht live geklärt):** Gilt das HV-Start-Gate für **jede** Meldung oder nur im Freigabe-Modus `freigabe`? Umgeht der Notfall-/Akut-Direktpfad das Gate zuverlässig auch bei Modus `direkt`? Bis zur Klärung: Code-Gate wie dokumentiert; Verhalten bei `freigabe_modus=direkt` auf Staging beobachten (A2-Mittelteil: Gate war trotzdem aktiv).

---

## 3) HV legt Vorgang selbst an

```
MeinBärenwald → Neuer Vorgang (HV-Funnel)
  → erscheint als Anfrage im CRM
  → gleicher Pipeline-Weg wie oben, inkl. Freigabe-Regeln
```

---

## 4) Angebot mit Partner-Einholung

```
CRM Angebot (oder Anfrage-Leistungen) → Handwerker anfragen (Token und/oder Portal)
  → Partner nimmt an / reicht Preis+PDF ein
  → CRM prüft Einreichung → EK übernehmen
  → Kundenangebot finalisieren & senden
```

Ohne Freigabe (HV): Partner-Versand ist blockiert (`assertPartnerVersandOrgFreigabe`).

### Org-Freigabe — Gate & Ausnahmen

**Regel:** Solange `org_freigabe_status` ∈ {`ausstehend`, `beschluss_ausstehend`, `abgelehnt`}, kein Partner-Versand (Angebot-Anfrage, Auftrag „an HW senden“, Zuweisungs-Mail, Redisposition, Assign+Notify).

**Kunden-/HV-Versand (Ist, bewusst — Zyklus final):** Bei `org_freigabe_status` ∈ {`ausstehend`, `beschluss_ausstehend`} ist der **Kunden-Versand** des Angebots **nicht** blockiert. Die HV braucht das zugestellte Angebot (PDF/Mail) zur Freigabe-Entscheidung. Nur der Partner-Weg ist gated. UI zeigt z. B. „Gesendet — Entscheidung ausstehend“ bzw. „Wartet auf Beschluss“. Siehe auch `PATTERN-LEITFADEN.md` §19.0.

**Beschluss-Parkzustand (HV-Portal):** Aus `ausstehend` kann die HV **Beschluss erforderlich** wählen → `beschluss_ausstehend`. Optional Versammlungsdatum und Protokoll-Link. Erst danach wieder Freigeben/Ablehnen; kein automatisches Zurück auf `ausstehend`.

**Zentrale Prüfung:** `assertPartnerVersandOrgFreigabe` → `orgFreigabeBlockiertPartner` / Message „Wartet auf Org-Freigabe…“.

**Refreeze nach AG-Korrektur:** War der Status `freigegeben` und der neue Angebotsbetrag liegt über der Schwelle **und** ist **höher** als der zuletzt freigegebene Betrag (`org_freigabe_log`), wird wieder `ausstehend` gesetzt und die HV benachrichtigt. `abgelehnt` bleibt eingefroren.

**Dokumentierte Ausnahme — Notmaßnahme:** `hv_meldung_status = notmassnahme` (HV-Sofortmaßnahme / CRM Notfall-Direkt) umgeht das Gate bewusst. Partner darf ohne Freigabe-Wartezeit beauftragt werden; nach normalem Angebotsfluss gilt das Gate wieder.

---

## 5) Auftragskoordination Handwerker

```
Auftrag → Leistungen: zuweisen (still) → an Handwerker senden (Notification)
  → Partner bestätigt im Portal
  → Formular-Links / Bautagebuch / Compliance / Vertrag nach Bedarf
  → Abnahmeprotokoll → Abschlussdokumentation Kunde
```

---

## 6) Nachtrag während Bau

```
CRM: Nachtrag / Baustopp anlegen
  → Kunde bestätigt über /nachtrag/[token]
  → Arbeit geht weiter; Positionen/Kosten nachgezogen
```

---

## 7) Rechnung & Zahlung

```
Auftrag Zahlungstab / Neu Rechnung
  → Wizard (Abschlag oder Schluss)
  → Versenden → Kunde zahlt → als bezahlt markieren
  → optional Mahnung
```

Partner kann **Eingangsrechnung** einreichen → erscheint in Vorgängen/Finanzen.

---

## 8) Korrekturen

| Situation | Kanonischer Weg |
|-----------|-----------------|
| Angebot ändern am laufenden Auftrag | AG-Korrektur-Wizard |
| Rechnung falsch | Storno mit Ersatz / Gutschrift / ohne Ersatz |
| Positionen steuern | PosBoard im Leistungen-Tab |

---

## 9) KI-gestützte Einstiege

| Einstieg | Ergebnis |
|----------|----------|
| BärenwaldGPT Visualisierung | Bilder + ggf. Preisrahmen → Lead |
| CRM Assistent | Entwürfe, Planung, Navigation, Mail-Vorschläge |
| Angebot Visualisierung | Bilder am Angebot für Kundenkommunikation |

---

## 10) Alltags-Jobs im CRM (Schnellreferenz)

| Job | Bevorzugter Einstieg |
|-----|----------------------|
| Neues Angebot | FAB/Wizard oder Primary „Angebot erstellen“ an Anfrage |
| Angebot senden | Wizard-Ende oder Detail-Versand |
| Rechnung senden | RechnungWizard |
| HW zuweisen | Auftrag → Leistungen |
| Abnahme | Auftrag → Abnahme-Wizard |
| Nachtrag Kunde | Auftrag Vor Ort/Abschluss → Nachtrag-Link |
| Etwas finden | TopBar-Suche |
| Heute planen | Dashboard + Assistent / Kalender |

---

## Bewusste Produktgrenzen

- **Formulare bearbeiten** im CRM-UI derzeit ausgeblendet; Token-Formulare für Ausfüller bleiben.
- **Partner-Nav** im CRM ist unter Handwerker zusammengeführt.
- Manche Marketing-/Analytics-Karten zeigen Quellen-Status, sind aber keine eigenen „Arbeitsmodule“.
- Soll-Navigation („Heute / Projekte / Kontakte / Finanzen“) ist Konzept — Ist-Nav siehe `05-CRM.md`.
