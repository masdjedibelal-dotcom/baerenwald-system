# UI-Inventar — Wo ist was?

**Stand:** 2026-08-25 · Analyse-only (keine Code-Änderungen)  
**Repos:** `baerenwald` (Website/Portale) + `baerenwald-system` (CRM/Token)  
**Quellen:** `src/app/**/page.tsx`, Surface-Docs, FAB/`primary-cta`/`naechste-schritte`

---

## 1. Routen-Inventar

### 1.1 Website — Marketing & Legal

| Bereich | Route | Screen-Name | Zweck | Wichtigste Aktionen | Rolle(n) | Surface-Typ |
|---------|-------|-------------|-------|---------------------|----------|-------------|
| Website | `/` | Landing | Marken-Landing, Trust, Einstieg Rechner/Kontakt | Rechner, CTA, Leistungen | anonym | Landing |
| Website | `/ueber-uns` | Über uns | Positionierung GU/Koordinator München | Weiter Rechner/Kontakt | anonym | Landing |
| Website | `/ratgeber` | Ratgeber-Index | Themenübersicht Kosten/Ablauf | Artikel öffnen | anonym | Liste |
| Website | `/ratgeber/[slug]` | Ratgeber-Artikel | SEO-Ratgeber + FAQ/CTA | Lesen, Rechner-CTA | anonym | Detail |
| Website | `/rechner` | Preisrechner | Multi-Step-/KI-Funnel → Lead | Situation, Details, Absenden | anonym | Wizard |
| Website | `/portal-tools/rechner` | Preisrechner (Clone) | Identischer Funnel unter anderem Pfad (Embed/CRM) | wie `/rechner` | anonym / Embed | Wizard |
| Website | `/leistungen/[slug]` | Leistungsseite | SEO-Leistungsdetail | Rechner, Anfrage | anonym | Landing |
| Website | `/handwerker-muenchen` | Handwerker-Hub | Stadtteil-/Leistungs-Hub | SEO-Links | anonym | Landing |
| Website | `/[slug]` | SEO-Slug | Dynamische Stadtteil/Gewerk-Seiten | Anfrage/Rechner | anonym | Landing |
| Website | `/kontakt` | Kontakt | Telefon/E-Mail | Anrufen, Mail | anonym | Landing |
| Website | `/impressum` | Impressum | Anbieterangaben | Lesen | anonym | Landing |
| Website | `/datenschutz` | Datenschutz | Website/Portal/GPT-Hinweise | Lesen | anonym | Landing |
| Website | `/agb` | AGB | Vertragsbedingungen | Lesen | anonym | Landing |

### 1.2 Melden (Whitelabel / Mieter)

| Bereich | Route | Screen-Name | Zweck | Wichtigste Aktionen | Rolle(n) | Surface-Typ |
|---------|-------|-------------|-------|---------------------|----------|-------------|
| Melden | `/melden/[org]` | Melde Org | Org-WL: Objekt wählen oder Formular | Objekt wählen, melden | Mieter (öffentlich) | Wizard |
| Melden | `/melden/[org]/[objekt]` | Melde Objekt | Objekt-gebundenes Meldeformular | Absenden | Mieter | Wizard |
| Melden | `/melden/[org]/impressum` | Melde-Impressum | HV-Inhalt + BW technischer Betrieb | Zurück | Mieter | Landing |
| Melden | `/melden/[org]/datenschutz` | Melde-Datenschutz | Org-Datenschutzhinweis | Zurück | Mieter | Landing |
| Melden | `/melden/bestaetigung` | Meldung eingegangen | Bestätigung + Status-Link + Registrierung | Status, Registrieren, Link kopieren | Mieter | Landing |
| Melden | `/melden/fehler` | Link nicht verfügbar | Ungültiger/deaktivierter Melde-Link | Zur Objektwahl (falls Org) | Mieter | Landing |
| Melden | `/melden/status/[token]` | Status Ihrer Meldung | Öffentlicher Token-Status ohne Login | Timeline, Anhänge, Termine, Feedback | Mieter (Token) | Detail |
| Melden | `/melden/ergaenzen/[token]` | Meldung ergänzen | Vorerfasste Meldung per Token vervollständigen | Ergänzen & absenden | Mieter (Token) | Wizard |

### 1.3 MeinBärenwald (Kunden-Portal)

| Bereich | Route | Screen-Name | Zweck | Wichtigste Aktionen | Rolle(n) | Surface-Typ |
|---------|-------|-------------|-------|---------------------|----------|-------------|
| MeinBärenwald | `/portal` | Portal-Dashboard | Rollen-Router: Privat / HV-Org / Eigentümer / Hausmeister | Vorgänge, Freigaben, Objekte, neue Anfrage | Kunde, HV, Eigentümer, HM | Liste / Detail |
| MeinBärenwald | `/portal/login` | Portal-Login | Anmeldung | Login, Passwort vergessen | Portal-User | Auth |
| MeinBärenwald | `/portal/registrieren` | Konto anlegen | Selbstregistrierung (Prefill aus Melde möglich) | Registrieren | Prospect/Mieter | Auth |
| MeinBärenwald | `/portal/passwort-vergessen` | Passwort vergessen | Reset anfordern | E-Mail senden | Portal-User | Auth |
| MeinBärenwald | `/portal/passwort-neu` | Neues Passwort | Passwort nach Reset | Speichern | Portal-User | Auth |
| MeinBärenwald | `/portal/einladung/[token]` | Einladung aktivieren | Einladung einlösen + Konto | Passwort, Zustimmen | Eingeladene | Auth |
| MeinBärenwald | `/portal/aushang/[objektId]` | Aushang-Redirect | Alte Print-Route → Aushang-PDF | Redirect | HV (indirekt) | Redirect |
| Auth | `/auth/callback` | Auth-Callback | OAuth/Code → Portal/Partner | Session, Redirect | System | Auth |

### 1.4 Partner-Portal

| Bereich | Route | Screen-Name | Zweck | Wichtigste Aktionen | Rolle(n) | Surface-Typ |
|---------|-------|-------------|-------|---------------------|----------|-------------|
| Partner | `/partner` | Partner-Dashboard | Anfragen, Aufträge, Doku, Abnahme | Annehmen, kalkulieren, dokumentieren | Handwerker | Liste / Detail |
| Partner | `/partner/login` | Partner-Login | Anmeldung | Login | Handwerker | Auth |
| Partner | `/partner/registrieren` | Partner-Registrierung | Erstregistrierung nach BW-Anlage | Registrieren | Handwerker | Auth |
| Partner | `/partner/passwort-vergessen` | Passwort vergessen | Reset anfordern | E-Mail senden | Handwerker | Auth |
| Partner | `/partner/passwort-neu` | Neues Passwort | Passwort setzen | Speichern | Handwerker | Auth |

### 1.5 CRM — Arbeit / Pipeline

| Bereich | Route | Screen-Name | Zweck | Wichtigste Aktionen | Rolle(n) | Surface-Typ |
|---------|-------|-------------|-------|---------------------|----------|-------------|
| CRM | `/` | Dashboard | KPIs, Funnel, Sprung in Vorgänge | Filtern, Kacheln | Staff | Landing |
| CRM | `/vorgaenge` | Vorgänge | **Kanonische** Pipeline-Liste (Anfrage→RE + HW-Eingang) | Filtern, Tabs, Detail | Staff | Liste |
| CRM | `/anfragen` | Anfragen (Alias) | → `/vorgaenge?tab=anfrage` | Redirect | Staff | Liste |
| CRM | `/anfragen/neu` | Neue Anfrage | Deep-Link-Host Anfrage-Wizard | Anlegen | Staff | Sheet |
| CRM | `/anfragen/[id]` | Anfrage-Detail | Lead inkl. Angebot-Wizard/HW | Angebot, Direkt beauftragen, HW, Termin | Staff | Detail |
| CRM | `/anfragen/[id]/angebote` | Anfrage-Angebote | → `?angebote=1` | Redirect | Staff | Detail |
| CRM | `/angebote` | Angebote (Alias) | → `/vorgaenge?tab=angebot` | Redirect | Staff | Liste |
| CRM | `/angebote/neu` | Neues Angebot / Edit | DocumentCanvas-Wizard (+ Gate Kunde) | Schreiben, senden, Vorlage | Staff | Canvas |
| CRM | `/angebote/[id]` | Angebot-Detail | Kundenangebot; Partner-Einholung → Anfrage | Annehmen, bearbeiten, ablehnen | Staff | Detail |
| CRM | `/angebote/[id]/bearbeiten` | Angebot bearbeiten | → `/angebote/neu?angebot_id=` | Redirect | Staff | Canvas |
| CRM | `/angebote/[id]/visualisierung` | KI-Visualisierung | Ist-/Zielbild zum Angebot | Session steuern | Staff | Canvas |
| CRM | `/auftraege` | Aufträge (Alias) | → `/vorgaenge?tab=auftrag` | Redirect | Staff | Liste |
| CRM | `/auftraege/[id]` | Auftrag-Detail | Ausführung, Abschließen, RE, Nachtrag, HW | Abschließen, RE, HW, Nachtrag | Staff | Detail |
| CRM | `/auftraege/[id]/abschluss` | Abschluss (Legacy) | → Auftrag-Detail | Redirect | Staff | — |
| CRM | `/auftraege/[id]/abnahme` | Abnahme (Legacy) | → `?tab=abnahme` (= Leistungen) | Redirect | Staff | — |
| CRM | `/auftraege/[id]/abnahme/erstellen` | Abnahme erstellen (Legacy) | → Auftrag-Detail | Redirect | Staff | — |
| CRM | `/auftraege/[id]/abnahme/maengel` | Mängel-Nacharbeit | Punch-List / Status nach Abnahme | Status, Frist, Fotos | Staff | Wizard |
| CRM | `/auftraege/[id]/finanzen` | Auftrag-Finanzen | Abschläge / Zahlplan | Einsehen/steuern | Staff | Detail |
| CRM | `/auftraege/[id]/rechnungen-auswahl` | RE-Auswahl | Entwurf vs. neue RE | Wählen / neu | Staff | Liste |
| CRM | `/rechnungen` | Rechnungen (Alias) | → `/vorgaenge?tab=rechnung` | Redirect | Staff | Liste |
| CRM | `/rechnungen/neu` | Neue Rechnung | DocumentCanvas (+ Gate / Auswahl) | Schreiben, versenden | Staff | Canvas |
| CRM | `/rechnungen/[id]` | Rechnung-Detail | Dokument & Zahlung | Versenden, bezahlt, Korrektur | Staff | Detail |

**Detail-Tabs (Pipeline-Entitäten):** Übersicht · Leistungen · Zahlung · Akte  
(Auftrag: Bautagebuch/Abnahme/Abschluss/Nachtrag → Deep-Links auf Leistungen.)

### 1.6 CRM — Stammdaten & Mehr

| Bereich | Route | Screen-Name | Zweck | Wichtigste Aktionen | Rolle(n) | Surface-Typ |
|---------|-------|-------------|-------|---------------------|----------|-------------|
| CRM | `/kunden` | Kunden-Liste | Master-Detail | Suche, öffnen | Staff | Liste |
| CRM | `/kunden/[id]` | Kunden-Detail | Stamm, Vorgänge, Objekte, Portal | Angebot/RE, Portal, Org (HV) | Staff | Detail |
| CRM | `/kunden/[id]/objekte/[objektId]` | Objektakte | Einheiten, Aushang, Freigabe, HM | Aushang-PDF, Freigabe, Personen | Staff | Detail |
| CRM | `/handwerker` | Handwerker-Liste | Master-Detail | Suche, öffnen | Staff | Liste |
| CRM | `/handwerker/[id]` | Handwerker-Detail | Stamm, Vorgänge, Compliance, Portal | Portal, Docs | Staff | Detail |
| CRM | `/partner` · `/partner/[id]` | Partner-Alias | → `/handwerker` | Redirect | Staff | — |
| CRM | `/kalender` | Kalender | Termine & Planung | Anlegen/verschieben | Staff | Canvas |
| CRM | `/ki-analytics` | KI Analytics | Cluster/Empfehlungen | Öffnen | Staff | Landing |
| CRM | `/mehr` | Mehr (Mobile) | Hub: Kunden, HW, Kalender, KI, Settings | Navigation | Staff | Landing |
| CRM | `/neu` | Neu-Host | Deep-Link `?art=` für FAB-Overlays | Anfrage/Angebot/RE/Kunde/HW/Termin/Todo | Staff | Sheet |
| CRM | `/preislisten` | Preislisten-Alias | → `/einstellungen/preise` | Redirect | Staff | — |

**Kunden-Tabs:** Übersicht · Vorgänge · Objekte* · Akte (+ Organisation als HV-Subview)  
**Handwerker-Tabs:** Übersicht · Vorgänge · Compliance · Akte

### 1.7 CRM — Einstellungen & Formulare

| Bereich | Route | Screen-Name | Zweck | Wichtigste Aktionen | Rolle(n) | Surface-Typ |
|---------|-------|-------------|-------|---------------------|----------|-------------|
| CRM | `/einstellungen` | Einstellungen | → `/einstellungen/firma` | Redirect | Staff | — |
| CRM | `/einstellungen/firma` | Firma | Branding, Firmendaten | Speichern | Staff | Detail |
| CRM | `/einstellungen/benutzer` | Team | Nutzer/Rollen | Invite, Rolle | Staff (Schreiben oft Admin) | Liste |
| CRM | `/einstellungen/sicherheit` | Sicherheit & DSGVO | Security-Settings | Ändern | Staff | Detail |
| CRM | `/einstellungen/benachrichtigungen` | Benachrichtigungen | Notify-Prefs | Speichern | Staff | Detail |
| CRM | `/einstellungen/preise` | Preislisten | Gewerke + Leistungen | Pflegen | Staff | Liste |
| CRM | `/einstellungen/integration` | Integrationen | Mock-Integrationen | Ansehen | Staff | Liste |
| CRM | `/einstellungen/vorlagen/neu` · `/[id]` | Angebots-Vorlagen | Vorlage anlegen/editieren | Speichern | Staff | Wizard |
| CRM | diverse Aliase (`formulare`, `profil`, `email`, `gewerke`, …) | — | → Firma oder Preise | Redirect | Staff | — |
| CRM | `/formulare/neu` · `/[id]/bearbeiten` · `/vorschau` | Formular-Templates | Template bauen/preview | Speichern | Staff | Wizard |

### 1.8 CRM — Auth

| Bereich | Route | Screen-Name | Zweck | Wichtigste Aktionen | Rolle(n) | Surface-Typ |
|---------|-------|-------------|-------|---------------------|----------|-------------|
| CRM | `/login` | Login | CRM-Anmeldung | Login, Reset anfordern | öffentlich → Staff | Auth |
| CRM | `/auth/reset-password` | Passwort setzen | Aus Reset-Link | Neues Passwort | Token/Staff | Auth |

### 1.9 Token-Seiten (CRM-Repo, öffentlich)

| Bereich | Route | Screen-Name | Zweck | Wichtigste Aktionen | Rolle(n) | Surface-Typ |
|---------|-------|-------------|-------|---------------------|----------|-------------|
| Token | `/nachtrag/[token]` | Nachtrag | Baustopp/Nachtrag vom Kunden-Link | Zustimmen (kein Ablehnen) | öffentlich | Wizard |
| Token | `/formular/[token]` | Öffentliches Formular | Lead/Formular-Eingabe | Absenden | öffentlich | Wizard |
| Token | `/handwerker/anfrage/[token]` | HW-Anfrage | Partner akzeptiert/ablehnt | Akzeptieren, Ablehnen | öffentlich | Wizard |
| Token | `/projekt/[token]` | Projektstatus | Kunden-Projektfortschritt | Status lesen | öffentlich | Landing |
| Token | `/status/[id]` | Lead-Status (Legacy) | Einfacher Lead-Status + Telefon | Anrufen | öffentlich | Landing |

---

## 2. Funktions-Sicht — „Ich will X → dort geht es“

Markierung **MULTI** = an mehreren Orten erreichbar (Redundanz prüfen: bewusst vs. inkonsistent).

| Funktion | Wo | MULTI? |
|----------|-----|--------|
| Anfrage anlegen | FAB „Anfrage“; `/anfragen/neu`; `/neu?art=anfrage`; Kunden-Kontext | **MULTI** |
| Angebot erstellen | Primary Anfrage; FAB; `/angebote/neu`; Kunde-Detail; `?angebot_wizard=1` | **MULTI** |
| Angebot korrigieren / bearbeiten | Angebot Secondary „bearbeiten“; `/angebote/neu?angebot_id=`; Auftrag „Auftrag bearbeiten“ (Korrektur-Canvas) | **MULTI** |
| Angebot annehmen / Direkt Auftrag | Primary Angebot; Nächste Schritte | **MULTI** |
| HW zuweisen / tauschen („neu disponieren“) | Auftrag Leistungen; Nächste Schritte; HW-Sheets | **MULTI** |
| HW-Angebot einholen / prüfen | Anfrage „HW einholen“; Auftrag-Schritt; Token `/handwerker/anfrage/[token]` | **MULTI** |
| Nachtrag (CRM) | Auftrag-Menü → Angebot-Wizard `nachtragZu`; Leistungen/Vertrag | **MULTI** |
| Nachtrag (Kunde Token) | `/nachtrag/[token]` | — |
| Partner-Regie anerkennen/ablehnen | Auftrag Leistungen-Tab (CRM) | — |
| Abnahme / Auftrag abschließen | Primary Auftrag; Sheet im Detail (Legacy-Routen redirecten) | **MULTI** (Einstiege) |
| Mängel nachverfolgen | `/auftraege/[id]/abnahme/maengel`; Nächste Schritte; Abnahme-Card | **MULTI** |
| Rechnung erstellen | FAB; Auftrag Primary/Schritte; `/rechnungen/neu`; Kunde Secondary; RE-Auswahl | **MULTI** |
| Rechnung versenden / bezahlt | Primary Rechnung; Nächste Schritte; Auftrag fertig-CTAs | **MULTI** |
| Portal-Impersonate | Kunden-/HW-Stammzeile; Objekt-HM (**Admin**) | **MULTI** |
| Kunde anlegen | FAB; `/neu?art=kunde` | **MULTI** |
| Handwerker anlegen | FAB; `/neu?art=handwerker` | **MULTI** |
| Objekt / Aushang-PDF | Kunden-Objekte → Objektakte | — |
| Freigabe (HV) | Kunde Organisation; Objektakte; Anfrage wartet auf HV | **MULTI** |
| Termin | FAB; Kalender; Anfrage-Menü | **MULTI** |
| To-do | FAB | — |
| Bewertung einholen | Primary Auftrag fertig / RE bezahlt | **MULTI** |
| Schaden melden (Mieter) | `/melden/[org]` · `/[objekt]` · QR/Aushang | **MULTI** (Einstiege) |
| Status Meldung (Mieter) | `/melden/status/[token]` | — |
| Projektstatus (Kunde) | `/projekt/[token]`; Legacy `/status/[id]` | **MULTI** (zwei Token-Welten) |
| Partner: Anfrage annehmen | `/partner` Offen; Token HW-Anfrage | **MULTI** |
| Partner: Doku / Abnahme | Partner-Auftragsdetail | — |
| HV: Freigaben / Objekte | `/portal` (Org-View) | — |

### Redundanz-Hinweis (wichtig für UX)

| Muster | Bewertung |
|--------|-----------|
| FAB + Detail-Primary + Nächste Schritte für Create/Versand | **Bewusst redundant** — gleiche Aktion, mehrere Einstiege (Spec Surface) |
| Vier Listen-Routen → `/vorgaenge` | **Bewusst Alias** — eine Liste |
| `/rechner` vs `/portal-tools/rechner` | **Uneinheitlich** — nahezu 1:1 Clone, zwei URLs |
| `/projekt/[token]` vs `/status/[id]` | **Gewachsen** — zwei öffentliche Status-Welten |
| Abnahme-Routen vs Sheet im Detail | **Legacy-Redirects** — Live-Flow = Detail |

---

## 3. Surface-Familien (Ist-Zuordnung)

| Surface (Soll-Name) | Ist im Code | Typische Screens |
|---------------------|-------------|------------------|
| DocumentCanvas | `DocumentCanvas` | Angebot-/RE-Wizard Fullscreen + DocBar |
| EditorSheet | `EditorSheet` | Anlegen/Bearbeiten Slide-over / Bottom Sheet |
| PickerSheet | `PickerSheet` / `KundePickerSheet` | Auswahl Kunde/HW |
| DetailShell | `DetailShell` / `MockDetailShell` | Anfrage/Angebot/Auftrag/RE/Kunde/HW |
| ActionSheet | `ActionSheet` | ⋯-Menüs |
| Modal | `ui/Modal` (+ `MockModal`) | Center-Dialoge, Confirm |
| MobileEditSheet / FormSheet / SidePanel | parallel vorhanden (Legacy) | Teilweise Legacy-Pfade |

---

## 4. Navigation-Einstiege CRM (Ist)

**FAB Neu:** Anfrage · Angebot · Rechnung · Kunde · Handwerker · Termin · To-do  
(Auftrag entsteht aus Angebot/Annahme — nicht im FAB.)

**Vorgänge-Phasen-Chips:** Alle · Anfrage · Angebot · Auftrag · Rechnung · Wartung & Pflege

---

*Nächste Dateien:* [AUDIT.md](./AUDIT.md) · [PATTERN-LEITFADEN.md](./PATTERN-LEITFADEN.md)
