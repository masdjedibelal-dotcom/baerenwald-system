# 05 — CRM (Mitarbeiter-Dashboard)

Produktteil im Repo **baerenwald-system**. Internes Werkzeug für Bärenwald-Staff.

## Look & Feel (Kurz)

- Dunkelgrüne Sidebar/Header, Akzentgrün, heller warmer Hintergrund
- Mock-Design-System: Buttons, Chips, Cards, Badges einheitlich
- **Ein Primary-Button** pro Screen = nächster Prozessschritt
- Desktop: Sidebar + TopBar (Suche, KI-Assistent, Glocke)
- Mobile: Bottom-Nav + FAB „Neu“ + Mehr-Menü
- Details: `07-DESIGN.md`

---

## Navigation

### Desktop-Sidebar

| Gruppe | Einträge |
|--------|----------|
| **Arbeit** | Dashboard · Vorgänge · Kunden · Handwerker |
| **Organisation** | Kalender · KI Analytics |
| unten | Einstellungen |

Hinweis: Früher gab es einen eigenen Nav-Punkt **Partner**; die Route leitet auf **Handwerker** um. Partner-Daten existieren weiter, Einstieg ist Handwerker.

### Mobile Bottom-Nav

Dashboard · Vorgänge · **+ Neu** · Kunden · **Mehr**  
Unter Mehr: Handwerker, Kalender, KI Analytics, Einstellungen.

---

## Dashboard `/`

- Zeitraum-Filter (Monat, Quartal, Custom)
- KPI-Kacheln: Neue Anfragen · Offene Angebote · Aktive Aufträge · Offene Rechnungen (klickbar → gefilterte Vorgänge)
- Umsatzverlauf, Vertriebs-Funnel, Gewerk-Umsatz
- Rankings Top-Handwerker / Top-Kunden
- Marketing-Quellen-Status (externe Analytics)
- Übergabe von KPI-Snapshot an KI möglich

**Soll-Idee** (Konzept): eher „Deine Schritte heute“ — Ist noch stark KPI/Analytics-lastig.

---

## Vorgänge `/vorgaenge`

Zentrale Pipeline. Alte Einzel-Listen (Anfragen/Angebote/…) existieren als Routen/Redirects, Nav führt über Vorgänge.

**Phasen-Chips:** Alle · Anfrage · Angebot · Auftrag · Rechnung · Wartung & Pflege  
**Lifecycle:** Offen / Erledigt

**Liste:** Kunde · Titel · Phase · Wert · Datum · Status  
**Funktionen:** Suche, Sortierung, CSV-Export, Mehrfachauswahl/Löschen, Duplizieren, Partner-Filter, Mobile-Filter, Pull-to-Refresh

Badges u. a.: Notfall, wartet auf Freigabe (HV), **Wartet auf Beschluss** (`org_freigabe_status=beschluss_ausstehend`). Partner-Eingangsrechnungen können in der Liste erscheinen.

**Filter Anfragen (Org-Kontext):** Spezialfilter „Entscheidung ausstehend“ umfasst `ausstehend` **und** `beschluss_ausstehend`.

---

## Kunden `/kunden`

- Liste nach Typ: Privat · Gewerbe · Hausverwaltung
- Desktop oft Master-Detail

**Detail-Tabs:** Übersicht · Objekte · Organisation · Vorgänge · Akte

| Tab | Inhalt |
|-----|--------|
| Übersicht | Stammdaten, Wirtschaftliches, Custom Fields, Portal-Einladung |
| Objekte | Objekte, Einheiten, Bewohner, Melde-Links |
| Organisation | Kennung, Logo, Freigabe-Modus, Schwellwert, Notfall-Direkt |
| Vorgänge | Alle Vorgänge des Kunden |
| Akte | Dokumente, Notizen, Kommunikation |

**Aktionen:** Angebot/Rechnung anlegen, E-Mail, Portal-Link, Spam, Zusammenführen, Löschen

---

## Handwerker `/handwerker`

**Tabs:** Übersicht · Vorgänge · Compliance · Akte

- Kontakt, Gewerke, Konditionen, Bewertungen
- Zugewiesene Projekte
- Compliance prüfen (Freigabe/Ablehnung)
- Portal-Link versenden, Rahmenvertrag

---

## Kalender `/kalender`

- Tag / Woche / Monat
- Termine (Besichtigung, Abnahme, …)
- Umschaltbar zu To-dos
- Verknüpfung mit Leads/Aufträgen möglich

---

## Einstellungen

**Hauptbereiche:** Firma · Team · Preislisten · Benachrichtigungen

| Bereich | Inhalt |
|---------|--------|
| Firma | Branding, Logo, Firmendaten, Anrede, MwSt., Rechnungsdefaults |
| Team | Benutzer, Rollen |
| Preislisten | Katalog nach Gewerk, CSV-Import, Einheiten, Preise |
| Benachrichtigungen | Push (PWA), Schalter pro Ereignis |

Weitere Unterseiten (teilweise nur per URL): Gewerke, Vorlagen, Compliance-Typen, Custom Fields, Datenschutz, Integrationen (teilweise Mock). **Formulare-UI** im CRM weitgehend ausgeblendet; öffentliche Formular-Links bleiben aktiv.

---

## Neu erstellen (FAB / Overlay)

Kopf: **Neu erstellen**

| Vorgänge | Stammdaten | Planung |
|----------|------------|---------|
| Anfrage | Kunde | Termin |
| Angebot | Handwerker | To-do |
| Rechnung | | |

Kein direkter FAB-Eintrag „Auftrag“ oder „Partner“ — Auftrag entsteht aus Angebot/Annahme; Partner steckt unter Handwerker. Öffnet Sheets/Wizards auf der aktuellen Seite.

---

## Suche & Benachrichtigungen

- **TopBar-Suche:** Kunden, Anfragen, Angebote, Aufträge, Rechnungen, Handwerker
- **Command Palette** (Schnellsuche)
- **Glocke:** ungelesen/alle, Sprung zum Vorgang, „Alle gelesen“

---

## KI im CRM

| Feature | Nutzen |
|---------|--------|
| **KI Assistent (Sidepanel)** | Chat mit Screen-Kontext; Quick-Prompts; Vorschläge/Aktionen (Entwürfe, Navigation, Mails) |
| **KI Analytics** `/ki-analytics` | Empfehlungen aus CRM + Marketing-Daten |
| **Visualisierung** am Angebot | Vorher/Nachher-Bilder, optional in Mail/PDF |
| **Telegram Copilot** | Gleicher Assistent unterwegs |
| **Feld-Hilfe** | KI-Hinweise an einzelnen Formularfeldern |

---

## Detailwelten der Pipeline

Überall: **Projekt-Kette** und Phasen-Verlauf. Tabs oft: Übersicht · Leistungen · Zahlung · Akte.

### Anfrage

- Status: Neu → … → Verloren/Abgeschlossen
- Staff-Funnel zum Anlegen (Situation, Bereiche, Preisrahmen, Kontext)
- Primary: **Angebot erstellen**
- Org-/HV-Kontext und Freigabe-Hinweise möglich

**Org-Freigabe am Lead (`org_freigabe_status`):**

| Wert | CRM / Portal |
|------|----------------|
| `nicht_noetig` | Unter Schwelle, Akut oder kein Freigabe-Modus |
| `ausstehend` | Angebot zur HV-Entscheidung; Badge „Ausstehend“ |
| `beschluss_ausstehend` | HV pausiert bis Eigentümerbeschluss; Badge **„Wartet auf Beschluss“** |
| `freigegeben` | Partner-Versand frei (Gate offen) |
| `abgelehnt` | Partner-Versand blockiert |

Optionale Felder (Parkzustand): `beschluss_versammlung_am`, `beschluss_protokoll_url` — gesetzt im HV-Portal. Log-Eintrag `org_freigabe_log.aktion=beschluss_ausstehend`.

**Partner-Gate:** `assertPartnerVersandOrgFreigabe` blockiert bei `ausstehend`, `beschluss_ausstehend` und `abgelehnt` (Ausnahme Notmaßnahme). Details: `06-PROZESSE.md` § Org-Freigabe.

### Angebot

- Wizard (DocumentCanvas): Kunde → Kopf → Positionen → Finalisieren → Vorschau → Senden
- Partner-Einholung und Einreichungsprüfung
- Primary je Status: Annehmen / Direkt Auftrag / Versand über Wizard/Menü
- Korrektur-Wizard am laufenden Auftrag möglich
- Visualisierungs-Seite am Angebot

### Auftrag

- Status: Offen · In Arbeit · Abnahme · Abgeschlossen · Storniert
- **Leistungen / PosBoard:** Positionen, HW zuweisen, an HW senden, Bautagebuch, Abnahme, Abschluss, Nachtrag
- Am Auftrag-Header: Badge **„Wartet auf Freigabe“** bzw. **„Wartet auf Beschluss“**, solange Lead-Freigabe offen ist
- Zahlung: Zahlungsplan, Abschläge, Rechnungen
- Primary je Status: Abschließen · Rechnung · Abschlag senden · Bezahlt · Bewertung
- Wizards: Abnahmeprotokoll, Abschlussdoku, Nachtrag/Baustopp, Projekt-/Nachunternehmervertrag, AG-Korrektur
- Kunden-Updates fließen in `/projekt/[token]`

### Rechnung

- Wizard: Positionen → Details → Zahlplan/Abschlag → Vorschau → Erstellen & Versenden
- Ausgehend (Kunde) / Eingehend (Partner)
- Storno-Modi: mit Ersatz, Gutschrift, ohne Ersatz
- Mahnung / Zahlungserinnerung

---

## Querschnittsfunktionen

| Feature | Nutzen |
|---------|--------|
| PosBoard | Tägliche Steuerung der Leistungszeilen |
| Zahlplan | Abschläge planen und abrufen |
| Bautagebuch | Tagesdokumentation |
| Dokumente & Notizen | In der Akte |
| E-Mail Compose + Inbound | Schreiben und Antworten in der Akte |
| Impersonation / Portal öffnen | Staff kann Portal-Ansicht öffnen (Admin) |
| Cron-Automatik (Hintergrund) | u. a. Einbehalte, Rechnungen, Datenschutz, Angebots-Nachfass |

---

## Integrationen (für Nutzer spürbar)

- E-Mail-Versand (Angebot, Rechnung, Links)
- Inbound-Mail → Akte
- Push-Benachrichtigungen
- Partner-Portal-Sync → Glocke/Status
- Website-Leads → Anfragen
- Analytics-Quellen im KI-Hub
