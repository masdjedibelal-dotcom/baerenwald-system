# 04 — Portale (Melden, MeinBärenwald, Partner)

Produktteil vor allem im Repo **baerenwald**. Ergänzend Token-Links aus dem CRM (`05-CRM.md`).

---

## A) Melden — Whitelabel für Mieter/Bewohner

**URL-Muster:** `/melden/[org]` bzw. `/melden/[org]/[objekt]`

Erscheinungsbild: Logo, Farben und Kontakt der **Hausverwaltung**, nicht zwingend Bärenwald-Marketing.

### Routen

| Route | Nutzen |
|-------|--------|
| `/melden/[org]` | Einstieg: bei einem Objekt direkt Formular; bei mehreren Objektwahl; sonst allgemeines Formular |
| `/melden/[org]/[objekt]` | Festes Objekt (z. B. QR vom Aushang) — Adresse vorausgefüllt |
| `/melden/bestaetigung` | Eingangsbestätigung, Referenznummer, Link zum Status, optional Registrierung |
| `/melden/status/[token]` | Status ohne Login: Timeline, Details, Fotos, Abnahme-PDF, Termine bestätigen/absagen, Sterne-Feedback |
| `/melden/ergaenzen/[token]` | Meldung per Einladungslink ergänzen |
| `/melden/fehler` | Ungültiger Link |
| `/melden/[org]/impressum` · `.../datenschutz` | Org-Rechtstexte oder Weiterleitung |

### Melde-Funnel (Schritte)

1. Situation („Es ist kaputt“, Renovierung, Hausmeisterservice, …)
2. Bereich/Gewerk, Fachfragen, Umfang, Zustand, Zeitraum
3. Fotos (optional)
4. Kontaktdaten (Name, E-Mail, Telefon, Einheit)
5. Datenschutz → Absenden

**Akutfälle:** Organisation kann Sofortmaßnahmen-Pfad konfigurieren. Optional KI-Assistenzfeld.

**Status-Timeline für Mieter:** Eingegangen → In Bearbeitung → Beauftragt → Handwerker vor Ort → Erledigt (Live-Aktualisierung).

---

## B) MeinBärenwald — Login-Portal `/portal/...`

Ein Login, **Inhalt je nach Kontotyp**:

| Modus | Zielgruppe | Typische Navigation |
|-------|------------|---------------------|
| **Organisation (HV)** | Hausverwaltung | Dashboard · Vorgänge · Objekte · Einstellungen |
| **Privat / Gewerbe** | Endkunden | Übersicht · Vorgänge · Einstellungen |
| **Mieter** | Bewohner | Start · Meine Meldungen · Konto |
| **Eigentümer** | Wohnungseigentümer | Dashboard · Vorgänge · Einheiten |
| **Hausmeister** | Objektbetreuer | Dashboard · Vorgänge · Objekte |

### Auth

- Login, Registrieren, Passwort vergessen/neu
- Einladung einlösen `/portal/einladung/[token]` (Mieter, Eigentümer, Hausmeister) mit HV-Branding
- Aushang `/portal/aushang/[objektId]` → PDF/QR für Melde-Link

### HV-Portal — Funktionen

- Dashboard mit KPIs (offen / in Arbeit / erledigt) und letzten Vorgängen
- **SLA-KPIs** unter den Kacheln: typische und **median** Reaktions- sowie Erledigungszeit (Rollfenster 90 Tage, API `/api/org/dashboard/sla`)
- Vorgänge filtern (Alle · Offen · In Arbeit · Erledigt), Objektfilter, Detail
- **Freigaben:** Kosten-/Angebotsfreigabe — siehe unten
- **Objekte:** anlegen/bearbeiten, Melde-Link kopieren, QR, Aushang-PDF, Einheiten/Mieter, Einladungen
- Neuer Vorgang (Funnel ähnlich Rechner, Kanal HV)
- Einstellungen: Profil, Logo/Whitelabel, Freigaberegeln, Benachrichtigungen, Team
- Onboarding-Hinweis bis Branding vollständig („Whitelabel-Gate“)
- Serviceabos/Marktplatz ggf. als „In Kürze“

### HV-Portal — Objekt-Akte (Detail)

Eine UI-Wahrheit: **kein paralleles Tab-Layout** — kanonische Tab-Reihenfolge:

**Stamm · Einheiten · Anlagen · Prüfpflichten · Historie · Vorgänge · Freigabe · Dokumente**

| Tab / Bereich | Inhalt |
|---------------|--------|
| **Stamm** | Stammdaten, KPI-Kacheln, **Kosten & Belege** (Jahres-/Monatswerte, Belegliste, CSV-Download) |
| **Einheiten** | Einheiten, Mieter, Einladungen |
| **Anlagen** | Technische Anlagen am Objekt |
| **Prüfpflichten** | Fristen, Status, Bearbeitung (PATCH); Badges auf Objekt-Card und Tab |
| **Historie** | Chronik am Objekt |
| **Vorgänge** | Vorgänge dieses Objekts |
| **Freigabe** | Freigabe-Queue / Meldungen zur Entscheidung |
| **Dokumente** | Objekt-Dokumente |

### HV-Portal — Vorgang-Detail (Organisation)

- **Versicherung & Abrechnung:** Kostenträger, Versicherungs-/Schaden-Nr., Versicherungsakte (PDF); bei geänderten Daten Hinweis + „Akte aktualisieren“
- Mobile: bei offener Angebots-Freigabe zuerst Freigabe-Banner, sonst Versicherungsblock vor Freigabe

### HV-Portal — Angebots-Freigabe (`org_freigabe_status`)

Gilt für Angebote **über der Freigabe-Schwelle** (nach Zustellung an die HV). Bypass Akut / unter Schwelle entfällt der Schritt.

| Status | Bedeutung | HV-Aktionen |
|--------|-----------|-------------|
| `ausstehend` | Angebot liegt zur Freigabe vor | **Freigeben** · **Ablehnen** · **Beschluss erforderlich** |
| `beschluss_ausstehend` | Parkzustand — wartet auf Eigentümerbeschluss | Banner „Wartet auf Eigentümerbeschluss“; optional **Versammlung am**, **Protokoll-Link**; danach **Freigeben** / **Ablehnen** (kein Zurücksetzen) |
| `freigegeben` | HV hat freigegeben | Partner-Versand im CRM möglich |
| `abgelehnt` | HV hat abgelehnt | Partner-Versand blockiert |
| `nicht_noetig` | Keine Freigabe nötig (Schwelle/Akut/Direkt) | — |

**Partner-Gate:** Solange Status ∈ {`ausstehend`, `beschluss_ausstehend`, `abgelehnt`}, kein Handwerker-Versand — analog `06-PROZESSE.md` § Org-Freigabe. Kunden-/HV-Angebotsversand bei `ausstehend` / `beschluss_ausstehend` weiterhin erlaubt (HV braucht das PDF).

**API (Website):** `POST /api/org/freigabe` (Aktionen oben), `PATCH /api/org/freigabe` (Meta: `beschluss_versammlung_am`, `beschluss_protokoll_url` im Parkzustand).

**UI:** `OrgFreigabeBanner` in Freigabe-Tab, Eingang und Angebots-Detail.

### Privatkunden-Portal

- Vorgänge Anfrage → Angebot → Auftrag → Abschluss
- Angebote ansehen, annehmen, ablehnen
- Dokumente, Bautagebuch, Feedback
- Konto- und Benachrichtigungs-Einstellungen

### Mieter / Eigentümer / Hausmeister

- **Mieter:** eigene Meldungen und Status (Whitelabel)
- **Eigentümer:** Einheiten, Mieter, Vorgänge/Freigaben
- **Hausmeister:** Objekt-Stammdaten, Vorgänge, Befund/Prüfung vor Ort (Checkliste)

---

## C) Partner-Portal `/partner/...`

Für Handwerksbetriebe im Netzwerk.

### Auth

Login · Registrieren · Passwort vergessen/neu

### Dashboard-Funktionen

- Start: KPIs (neue Anfragen, in Ausführung, erledigt), letzte Vorgänge, Onboarding
- Vorgänge: Liste + Detail (Anfrage / Angebot / Auftrag)
- Am Auftrag: Leistungen dokumentieren, Angebot-PDF hochladen, Rechnung einreichen, Dokumente, Abnahmeprotokoll, Bautagebuch
- Planer: Termine/Aufgaben
- Firmendaten: Profil, Compliance-Checkliste, Rahmenvertrag, Leistungen & Konditionen, Controlling
- Bereich **BärenwaldGPT** (eingebetteter KI-Chat)
- Sperrhinweis bei gesperrtem/gelöschtem Partner

---

## D) Token-Portale aus dem CRM (ohne Login)

Diese Seiten liegen im **CRM-Repo**, gehören aber zur Portal-Erfahrung:

| Link | Für wen | Inhalt |
|------|---------|--------|
| `/projekt/[token]` | Kunde | 5 Phasen, Fortschritt, Meilensteine, Timeline/Updates, Angebote, Nachträge, Kontakt |
| `/status/[id]` | Lead | Einfacher Status + Telefon-CTA |
| `/formular/[token]` | HW/extern | Ausfüllbares Formular (Text, Checkbox, Foto), Zwischenspeichern |
| `/handwerker/anfrage/[token]` | Handwerker | Anfrage annehmen/ablehnen ohne Portal-Login |
| `/nachtrag/[token]` | Kunde | Nachtrag prüfen und bestätigen |

---

## Zusammenspiel Portal ↔ CRM (Kurz)

1. HV legt Objekt + Melde-Link im CRM an → Mieter meldet auf Website.
2. Meldung wird Anfrage im CRM → Staff arbeitet Angebot aus.
3. Freigabe im HV-Portal kann nötig sein, bevor Partner angeschrieben werden — inkl. Parkzustand **Beschluss erforderlich** (`beschluss_ausstehend`).
4. Partner arbeitet im Partner-Portal oder per Token-Link.
5. Kunde sieht Fortschritt in MeinBärenwald und/oder `/projekt/[token]`.
