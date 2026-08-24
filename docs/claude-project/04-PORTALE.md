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
- Vorgänge filtern (Alle · Offen · In Arbeit · Erledigt), Objektfilter, Detail
- **Freigaben:** Kosten-/Angebotsfreigabe annehmen oder ablehnen
- **Objekte:** anlegen/bearbeiten, Melde-Link kopieren, QR, Aushang-PDF, Einheiten/Mieter, Einladungen
- Neuer Vorgang (Funnel ähnlich Rechner, Kanal HV)
- Einstellungen: Profil, Logo/Whitelabel, Freigaberegeln, Benachrichtigungen, Team
- Onboarding-Hinweis bis Branding vollständig („Whitelabel-Gate“)
- Serviceabos/Marktplatz ggf. als „In Kürze“

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
3. Freigabe im HV-Portal kann nötig sein, bevor Partner angeschrieben werden.
4. Partner arbeitet im Partner-Portal oder per Token-Link.
5. Kunde sieht Fortschritt in MeinBärenwald und/oder `/projekt/[token]`.
