# 01 — Überblick: Was ist Bärenwald?

## In einem Satz

Bärenwald organisiert Handwerksleistungen in München: Kunden und Hausverwaltungen melden Bedarfe, Bärenwald erstellt Angebote und koordiniert Handwerker, bis Abnahme und Rechnung fertig sind — über Website, Portale und ein internes CRM.

## Marke & Positionierung

- **Name:** Bärenwald München
- **Versprechen:** Handwerker aus einer Hand — ein Ansprechpartner, geprüfte Meisterbetriebe, Preisrahmen online
- **Gebiet:** München und ca. 70 km Umkreis
- **Rolle:** Koordination / Generalunternehmer — nicht jedes Gewerk selbst ausführen, sondern Netzwerk steuern
- **Kontakt (öffentlich):** Telefon 089 80955726 · E-Mail info@baerenwaldmuenchen.de · WhatsApp auf der Website

## Die drei Welten

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  ÖFFENTLICHE        │     │  PORTALE             │     │  CRM (intern)       │
│  WEBSITE            │     │  MeinBärenwald       │     │  Mitarbeiter        │
│  Marketing, SEO,    │────▶│  Melden (Whitelabel) │◀───▶│  Pipeline, Wizards, │
│  Preisrechner, GPT  │     │  Partner-Portal      │     │  Handwerker, KI     │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
```

| Welt | Für wen? | Typische Aufgabe |
|------|----------|------------------|
| **Website** | Interessenten, SEO-Besucher | Leistung verstehen, Preisrahmen, Anfrage starten |
| **Melden** | Mieter / Bewohner einer HV | Schaden melden, Status verfolgen |
| **MeinBärenwald** | Kunde, HV, Mieter, Eigentümer, Hausmeister | Vorgänge sehen, freigeben, Objekte verwalten |
| **Partner-Portal** | Handwerksbetriebe | Anfragen annehmen, Dokumente, Abnahme |
| **CRM** | Bärenwald-Mitarbeiter | Alles steuern: Angebote, Aufträge, Rechnungen, Zuweisung |

## Repos (nur zur Orientierung)

| Repo | Produktteil |
|------|-------------|
| `baerenwald` | Website, Melden, MeinBärenwald, Partner-Portal, Rechner/GPT |
| `baerenwald-system` | CRM-Dashboard, Token-Links (Projektstatus, Formular, HW-Anfrage, Nachtrag) |

Beide teilen dieselbe Fachwelt (Kunden, Vorgänge, Objekte, Organisationen) über dieselbe Datenbasis (Supabase).

## Rollen — wer darf was sehen?

| Rolle | Einstieg | Sieht vor allem |
|-------|----------|-----------------|
| **Endkunde (Privat/Gewerbe)** | Website-Rechner → MeinBärenwald | Eigene Anfragen, Angebote, Auftragsfortschritt |
| **Mieter** | Melde-Link / QR / Aushang | Meldung absenden, Status, Termine, Feedback |
| **Hausverwaltung (Organisation)** | MeinBärenwald | Alle Objekt-Vorgänge, Freigaben, Objekte, Team |
| **Eigentümer** | MeinBärenwald (Einladung) | Einheiten, Vorgänge, Freigaben |
| **Hausmeister** | MeinBärenwald (Einladung) | Objekte, Vorgänge, Befund vor Ort |
| **Partner-Handwerker** | Partner-Portal oder Token-Link | Zugewiesene Jobs, Einreichungen, Compliance |
| **CRM-Staff** | CRM Login | Gesamte Pipeline und Stammdaten |

## Der rote Faden: ein Vorgang

Unabhängig vom Einstieg (Website, Melden, Telefon, HV-Portal) landet Arbeit als **Vorgang** in der Kette:

**Anfrage → Angebot → Auftrag → Rechnung → fertig**

Zusätzlich bei Hausverwaltungen: **Freigabe** (Kosten/Angebot), bevor Handwerker beauftragt werden.

## Was bewusst getrennt ist

| Thema | Wo es lebt |
|-------|------------|
| Marketing & SEO-Seiten | Website |
| Preisrechner & BärenwaldGPT | Website (+ Portal-Tools) |
| Mieter-Meldung Whitelabel | Website `/melden/...` |
| Login-Portale (Kunde/HV/Partner) | Website |
| Tagesarbeit der Mitarbeiter | CRM |
| Angebot/Rechnung schreiben | CRM (Wizards) |
| Schneller Status-Link ohne Login | CRM-Token `/projekt/...`, Website `/melden/status/...` |

## Wichtige Produktprinzipien

1. **Ein Ansprechpartner** für den Kunden — intern viele Handwerker.
2. **Gleiche Geschichte überall** — Phase und Status sollen in Portal und CRM zusammenpassen.
3. **Whitelabel für HVs** — Mieter sehen die Verwaltung, nicht zwingend „Bärenwald“ als Absender der Meldung.
4. **Ein klarer nächster Schritt** — besonders im CRM: ein grüner Hauptbutton.
5. **Dokumentation & Vertrauen** — Fotos, Bautagebuch, Abnahme, PDFs gehören zum Produkt, nicht nur „nice to have“.
