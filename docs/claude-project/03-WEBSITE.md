# 03 — Website (Marketing, SEO, Rechner, GPT)

Produktteil im Repo **baerenwald**. Öffentliche Marke und Lead-Maschine.

## Globale Navigation

**Hauptmenü:** Start · Leistungen (Dropdown) · Ratgeber (Dropdown) · So geht’s · FAQ · Information (Über uns, Kontakt) · CTA **Anfragen**

**Footer:** Leistungen, Ratgeber, Impressum, Datenschutz, AGB, Cookie-Einstellungen, Social, WhatsApp (mobil)

**Tone:** Marketing oft Du („dein Projekt“); Portale und Formales eher Sie.

---

## Seiten & Funktionen

### Startseite `/`

- Hero mit Markenversprechen
- Leistungs-Karussell
- Projektgalerie
- Ablauf-Timeline („So geht’s“)
- Kundenstimmen
- FAQ
- Abschluss-CTA zum Rechner
- Floating WhatsApp-Button
- Links zu MeinBärenwald und Partner-Portal

### Leistungen `/leistungen/[slug]-muenchen`

Ca. **15 Leistungs-Landingpages**, z. B.:

- Bad sanieren, Rohrbruch, Hausmeisterservice und weitere Gewerke/Themen

Pro Seite typischerweise: Beschreibung, Preisspanne, FAQ, Einstieg in Anfrage/Rechner, Links zu Stadtteil-Seiten und Ratgeber.

### Ratgeber `/ratgeber` und `/ratgeber/[slug]`

- Übersicht aller Themen
- Ca. **18 Artikel** zu Kosten, Ablauf, Notfall, Komplettsanierung usw.

### Kontakt `/kontakt`

- Telefonzeiten (Mo–Fr 8–18), Notfall-Hinweis
- E-Mail, Einzugsgebiet
- Vertrauenspunkte
- CTAs: Anruf, E-Mail, Rechner

### Über uns `/ueber-uns`

- Story und Koordinationsmodell
- Prozesse (Checklisten, Foto-Dokumentation)
- Link zum Rechner

### Handwerker München `/handwerker-muenchen`

SEO-Hub: Stadtteile × Gewerke (Maler, Elektriker, Sanitär, Boden, Fliesen, Heizung, Dach, Badsanierung …).

### Dynamische SEO-Seiten `/[slug]`

Sehr viele lokale Seiten aus Content-Daten (Beispielmuster: `maler-muenchen-schwabing`) — Stadtteil + Leistung.

### Rechtliches

- `/impressum` — Anbieterangaben (Beran Cakmak / Bärenwaldstraße 20, München)
- `/datenschutz`
- `/agb` (Stand Mai 2026)

### Auth-Callback `/auth/callback`

Technische Zwischenstation nach Login — Nutzer wird weitergeleitet.

---

## Preisrechner `/rechner`

Zentrale Conversion-Strecke. Nicht für Suchmaschinen indexiert.

### Einstieg

1. Trust-/Vertrauensscreen
2. Wahl:
   - **Preisrahmen ermitteln** (klassischer Schritt-für-Schritt-Funnel)
   - **Frag einfach los** (**BärenwaldGPT**)

### Klassischer Funnel

1. Situation wählen (z. B. renovieren, kaputt, Hausmeisterservice)
2. Bereiche/Gewerke und Fachdetails
3. Größe/Umfang, PLZ/Ort, Kundentyp, Zeitraum
4. **Preisrahmen** berechnen (Spanne, Hinweise bei Komplexität)
5. Kontaktdaten + Datenschutz
6. Anfrage absenden
7. Danke-Seite

Optional: MeinBärenwald-Login vor Preisanzeige (je nach Funnel-Variante).

### BärenwaldGPT (im Rechner)

- Freitext-Chat zum Vorhaben
- **Raum visualisieren:** Ist-Foto (+ optional Inspiration) → Analyse → Vorher/Nachher-Visualisierung
- Preisrahmen aus dem Gespräch ableiten und in den klassischen Funnel übergeben
- Beratungs-Anfrage / Lead-Formular im Chat
- Optional Spracheingabe
- Session-Limits für Renderings; ggf. Registrierungs-Gate

### Portal-Tools `/portal-tools/rechner`

Gleicher Rechner; mit `?modus=ki` direkter Einstieg in GPT (ohne Trust/Auswahl) — für eingeloggte Portal-Nutzer inkl. Prefill.

---

## Was die Website an das Gesamtsystem übergibt

| Aktion auf der Website | Wirkung im Gesamtsystem |
|------------------------|-------------------------|
| Rechner/GPT-Anfrage absenden | Anfrage/Lead im CRM |
| Melde-Formular absenden | Anfrage mit Org-/Objekt-Kontext |
| Angebot annehmen (Portal) | Statuswechsel Richtung Auftrag |
| Partner reagiert | Rückmeldung in CRM / Benachrichtigungen |

Details zu Melden und Login-Portalen: siehe `04-PORTALE.md`.
